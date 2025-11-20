from flask import Flask, render_template, request, jsonify, session
import requests
import os
from datetime import timedelta, datetime
import PyPDF2
import io
import re
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs
import json
import html
from cache import cached


app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)


# DEFAULT Canvas URL - can be overridden per user
DEFAULT_CANVAS_URL = 'https://swinburne.instructure.com/api/v1'


@app.route('/')
def home():
    if 'canvas_token' in session:
        return render_template('chat.html')
    else:
        return render_template('login.html')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    canvas_token = data.get('canvas_token', '').strip()
    canvas_url = data.get('canvas_url', DEFAULT_CANVAS_URL).strip()
   
    # Ensure URL ends with /api/v1
    if not canvas_url.endswith('/api/v1'):
        if canvas_url.endswith('/'):
            canvas_url = canvas_url + 'api/v1'
        else:
            canvas_url = canvas_url + '/api/v1'
   
    if not canvas_token:
        return jsonify({'success': False, 'message': 'Please provide your Canvas API token'}), 400
   
    try:
        headers = {'Authorization': f'Bearer {canvas_token}'}
        response = requests.get(f'{canvas_url}/users/self', headers=headers, timeout=10)
       
        if response.status_code == 200:
            user_data = response.json()
            session['canvas_token'] = canvas_token
            session['canvas_url'] = canvas_url
            session['user_name'] = user_data.get('name', 'User')
            session['user_id'] = user_data.get('id')
            session.permanent = True
           
            return jsonify({
                'success': True,
                'message': f'Welcome, {user_data.get("name")}!',
                'user_name': user_data.get('name')
            })
        else:
            return jsonify({
                'success': False,
                'message': '✖ Invalid Canvas token or URL. Please check your credentials and try again.'
            }), 401
   
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'✖ Error verifying token: {str(e)}'
        }), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'canvas_token' in session:
        return jsonify({
            'logged_in': True,
            'user_name': session.get('user_name', 'User')
        })
    else:
        return jsonify({'logged_in': False})


@app.route('/api/chat', methods=['POST'])
def chat():
    """FIXED: Now properly handles conversation history from frontend"""
    if 'canvas_token' not in session:
        return jsonify({'error': 'Please log in first'}), 401
   
    data = request.json
    user_query = data.get('query', '')
    gemini_key = data.get('gemini_key', '')
    
    # CRITICAL FIX: Get conversation history from request (NOT from session)
    # This ensures uploaded file content is included in the conversation
    conversation_history = data.get('history', [])
    
    if not gemini_key:
        return jsonify({'error': 'Please provide Gemini API key'}), 400
   
    try:
        canvas_url = session.get('canvas_url', DEFAULT_CANVAS_URL)
        canvas_context = get_canvas_context(user_query, session['canvas_token'], canvas_url, session['user_id'])
        
        # Pass the conversation_history from the request to Gemini
        response = call_gemini(canvas_context, gemini_key, conversation_history)
        
        return jsonify({'response': response})
   
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        filename = file.filename
        content = ''
        
        if filename.endswith('.pdf'):
            try:
                pdf_file = io.BytesIO(file.read())
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page in pdf_reader.pages:
                    content += page.extract_text()
            except Exception as e:
                return jsonify({'error': f'Error processing PDF file: {str(e)}'}), 500
        elif filename.endswith('.txt'):
            try:
                content = file.read().decode('utf-8')
            except Exception as e:
                return jsonify({'error': f'Error processing text file: {str(e)}'}), 500
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
            
        session['uploaded_file_content'] = content
        session['uploaded_file_name'] = filename
        
        return jsonify({'success': True, 'filename': filename, 'content': content})


@app.route('/api/verify-key', methods=['POST'])
def verify_key():
    data = request.json
    api_key = data.get('api_key', '')
   
    if not api_key:
        return jsonify({'valid': False, 'message': 'API key is required'}), 400
   
    try:
        test_models = [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.5-pro-preview-03-25'
        ]
       
        suitable_model = None
       
        for test_model in test_models:
            print(f"Testing model: {test_model}")
            test_url = f'https://generativelanguage.googleapis.com/v1beta/models/{test_model}:generateContent?key={api_key}'
            test_payload = {
                'contents': [{'parts': [{'text': 'Hi'}]}],
                'generationConfig': {'maxOutputTokens': 10}
            }
           
            try:
                test_response = requests.post(test_url, json=test_payload, timeout=10)
                if test_response.status_code == 200:
                    suitable_model = test_model
                    print(f"✅ Found working model: {suitable_model}")
                    break
                else:
                    print(f"✖ Model {test_model} failed: {test_response.status_code} - {test_response.text}")
            except Exception as e:
                print(f"✖ Model {test_model} error: {str(e)}")
                continue
       
        if suitable_model:
            with open('gemini_model.txt', 'w') as f:
                f.write(suitable_model)
            print(f"💾 Saved model to file: {suitable_model}")
            return jsonify({'valid': True, 'message': f'✅ API key is valid! Using model: {suitable_model}'})
        else:
            return jsonify({'valid': False, 'message': '✖ No suitable Gemini model found. Please check your API key and quota.'})
   
    except Exception as e:
        return jsonify({'valid': False, 'message': f'✖ Error: {str(e)}'}), 500


def calculate_required_grade(current_grades, target_percentage=80):
    """
    Calculate what grades are needed on remaining assignments to achieve target percentage
    """
    total_earned = 0
    total_possible = 0
    remaining_assignments = []
    
    for assignment in current_grades:
        points_possible = assignment.get('points_possible', 0)
        submission = assignment.get('submission', {})
        score = submission.get('score')
        
        if score is not None:
            # Assignment is graded
            total_earned += score
            total_possible += points_possible
        elif points_possible > 0:
            # Assignment not yet graded
            remaining_assignments.append({
                'name': assignment.get('name'),
                'points': points_possible
            })
            total_possible += points_possible
    
    if total_possible == 0:
        return None
    
    # Calculate points needed for target
    target_points = (target_percentage / 100) * total_possible
    points_needed = target_points - total_earned
    
    # Calculate remaining points available
    remaining_points = sum(a['points'] for a in remaining_assignments)
    
    if remaining_points == 0:
        current_percentage = (total_earned / total_possible) * 100
        return {
            'current_percentage': round(current_percentage, 2),
            'target_percentage': target_percentage,
            'achievable': current_percentage >= target_percentage,
            'message': f"All assignments graded. Current grade: {round(current_percentage, 2)}%"
        }
    
    # Calculate required percentage on remaining assignments
    required_percentage = (points_needed / remaining_points) * 100
    
    return {
        'current_earned': total_earned,
        'current_possible': total_possible,
        'current_percentage': round((total_earned / total_possible) * 100, 2) if total_possible > 0 else 0,
        'target_percentage': target_percentage,
        'points_needed': round(points_needed, 2),
        'remaining_points': remaining_points,
        'required_percentage': round(required_percentage, 2),
        'achievable': required_percentage <= 100,
        'remaining_assignments': remaining_assignments
    }


def extract_youtube_id(url):
    """Extract YouTube video ID from various URL formats"""
    try:
        if not url:
            return None
        parsed = urlparse(url)
        if 'youtu.be' in parsed.netloc:
            vid = parsed.path.lstrip('/')
            if vid:
                return vid.split('?')[0]
            return None
        if 'youtube.com' in parsed.netloc:
            query_params = parse_qs(parsed.query)
            if 'v' in query_params:
                return query_params.get('v', [None])[0]
            path_parts = parsed.path.split('/')
            if 'embed' in path_parts:
                idx = path_parts.index('embed')
                if idx + 1 < len(path_parts):
                    return path_parts[idx + 1]
        return None
    except:
        return None


@cached(key_prefix='video_transcript')
def get_video_transcript(video_url, user_id):
    """Get transcript from YouTube video"""
    try:
        video_id = extract_youtube_id(video_url)
        if not video_id:
            return None
       
        print(f"🎥 Fetching transcript for video ID: {video_id}")
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
       
        full_transcript = ' '.join([segment['text'] for segment in transcript_list])
        full_transcript = re.sub(r'\s+', ' ', full_transcript).strip()
       
        print(f"✅ Successfully fetched transcript ({len(full_transcript)} characters)")
        return full_transcript
   
    except Exception as e:
        print(f"✖ Error fetching transcript: {str(e)}")
        return None


@cached(key_prefix='pdf_text')
def extract_pdf_text(pdf_url, headers, user_id):
    """Extract text content from a PDF file"""
    try:
        if not pdf_url:
            return None
        print(f"📄 Downloading PDF from: {pdf_url}")
        response = requests.get(pdf_url, headers=headers, timeout=30)
        if response.status_code == 200:
            pdf_file = io.BytesIO(response.content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
           
            text = ""
            max_pages = min(50, len(pdf_reader.pages))
            print(f"📖 Extracting text from {max_pages} pages...")
           
            for page_num in range(max_pages):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text() or ""
                text += page_text + "\n"
           
            text = re.sub(r'\s+', ' ', text).strip()
            extracted_text = text[:20000]
            print(f"✅ Extracted {len(extracted_text)} characters from PDF")
            return extracted_text
        else:
            print(f"✖ PDF fetch failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error extracting PDF: {str(e)}")
        return None


@cached(key_prefix='page_content')
def get_page_content(course_id, page_url, headers, canvas_url, user_id):
    """Fetch Canvas Page content"""
    try:
        print(f"📄 Attempting to fetch page: {page_url}")
       
        try:
            response = requests.get(page_url, headers=headers, timeout=15)
        except Exception:
            response = None
       
        if not response or response.status_code != 200:
            if page_url and not page_url.startswith('http'):
                api_page_url = f"{canvas_url}/courses/{course_id}/pages/{page_url}"
                try:
                    response = requests.get(api_page_url, headers=headers, timeout=15)
                except Exception:
                    response = None
       
        if not response:
            print("❌ Could not fetch page (no response)")
            return None
       
        print(f"📡 Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ Non-200 response for page: {response.status_code}")
            return None
       
        try:
            page_data = response.json()
            page_body = page_data.get('body', '')
            page_title = page_data.get('title', '')
            clean_text = re.sub(r'<br\s*/?>', '\n', page_body)
            clean_text = re.sub('<p>', '\n', clean_text)
            clean_text = re.sub('<[^<]+?>', '', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            urls = re.findall(r'href=["\']([^"\\]+)["\\]', page_body)
           
            extracted_content = clean_text[:20000]
            print(f"✅ Extracted {len(extracted_content)} characters from page")
            
            return {
                'title': page_title,
                'content': extracted_content,
                'urls': urls[:10]
            }
        except ValueError:
            html_text = response.text
            title_match = re.search(r'<title>(.*?)</title>', html_text, re.IGNORECASE|re.DOTALL)
            page_title = html.unescape(title_match.group(1)).strip() if title_match else ''
            clean_text = re.sub(r'(<br\s*/?>|</p>|</div>)', '\n', html_text, flags=re.IGNORECASE)
            clean_text = re.sub('<[^<]+?>', '', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            urls = re.findall(r'href=["\']([^"\\]+)["\\]', html_text)
            
            extracted_content = clean_text[:20000]
            print(f"✅ Extracted {len(extracted_content)} characters from HTML page")
            
            return {
                'title': page_title,
                'content': extracted_content,
                'urls': urls[:10]
            }
    except Exception as e:
        print(f"❌ Error fetching page content: {str(e)}")
        return None


def find_target_course(query_lower, all_courses):
    """Universal course finder - works for ANY course in ANY Canvas instance"""
    try:
        print(f"🔍 Searching for course in query: '{query_lower}'")
        
        course_code_match = re.search(r'\b[A-Z]{2,4}\d{4,5}\b', query_lower.upper())
        if course_code_match:
            course_code = course_code_match.group(0)
            for course in all_courses:
                if course_code in course.get('course_code', '').upper():
                    print(f"✅ Found course by code: {course.get('name')}")
                    return course
        
        stop_words = {
            'the', 'and', 'of', 'in', 'to', 'a', 'an', 'for', 'with', 'on', 'at',
            '2024', '2025', '2026', 'semester', 'term', 'quarter', 'spring', 'fall', 'summer', 'winter',
            'hs1', 'hs2', 'h1', 'h2', 's1', 's2', 't1', 't2', 't3', 'q1', 'q2', 'q3', 'q4',
            'what', 'is', 'my', 'give', 'me', 'show', 'tell', 'about', 'from',
            'summarize', 'summary', 'explain', 'describe', 'week', 'module', 'lecture'
        }
        
        query_words = [word for word in query_lower.split() if word not in stop_words and len(word) > 2]
        
        best_match = None
        best_score = 0
        
        for course in all_courses:
            course_name = course.get('name', '').lower()
            course_code = course.get('course_code', '').lower()
            
            score = 0
            
            for i in range(len(query_words)):
                for j in range(i + 1, len(query_words) + 1):
                    phrase = ' '.join(query_words[i:j])
                    if phrase in course_name:
                        score += (j - i) * 3
                        print(f"  🔎 Phrase match '{phrase}' in {course.get('name')}: +{(j - i) * 3}")
            
            for word in query_words:
                if word in course_name:
                    score += 1
                    print(f"  🔎 Word match '{word}' in {course.get('name')}: +1")
                elif word in course_code:
                    score += 2
                    print(f"  🔎 Code match '{word}' in {course.get('course_code')}: +2")
            
            common_abbreviations = {
                'oop': ['object oriented programming', 'object-oriented programming'],
                'dsa': ['data structures', 'algorithms', 'data structures and algorithms'],
                'ml': ['machine learning'],
                'ai': ['artificial intelligence'],
                'db': ['database'],
                'os': ['operating system'],
                'cn': ['computer network'],
                'se': ['software engineering'],
                'calc': ['calculus'],
                'bio': ['biology'],
                'chem': ['chemistry'],
                'phys': ['physics'],
                'stats': ['statistics'],
                'econ': ['economics'],
                'psych': ['psychology'],
                'cs': ['computer science'],
                'it': ['information technology']
            }
            
            for word in query_words:
                if word in common_abbreviations:
                    for term in common_abbreviations[word]:
                        if term in course_name:
                            score += 5
                            print(f"  🔎 Abbreviation match '{word}' -> '{term}' in {course.get('name')}: +5")
                            break
            
            if score > best_score:
                best_score = score
                best_match = course
                print(f"  ⭐ New best match: {course.get('name')} (score: {score})")
        
        if best_match and best_score >= 2:
            print(f"✅ Found course: {best_match.get('name')} (final score: {best_score})")
            return best_match
        else:
            print(f"❌ No confident course match found (best score: {best_score})")
            
    except Exception as e:
        print(f"❌ Error in find_target_course: {e}")
    
    return None


@cached(key_prefix='calendar_events')
def get_calendar_events(headers, canvas_url, user_id, days_ahead=14):
    """Fetch upcoming calendar events"""
    try:
        start_date = datetime.now().isoformat()
        end_date = (datetime.now() + timedelta(days=days_ahead)).isoformat()
       
        response = requests.get(
            f'{canvas_url}/calendar_events',
            headers=headers,
            params={
                'start_date': start_date,
                'end_date': end_date,
                'per_page': 100,
                'all_events': True
            },
            timeout=10
        )
       
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Calendar fetch failed: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error fetching calendar: {str(e)}")
        return []


@cached(key_prefix='upcoming_assignments')
def get_upcoming_assignments(headers, canvas_url, user_id, days_ahead=14):
    """Fetch upcoming assignments"""
    try:
        courses_response = requests.get(
            f'{canvas_url}/users/self/courses?enrollment_state=active&per_page=100',
            headers=headers,
            timeout=10
        )
       
        if courses_response.status_code != 200:
            print(f"Failed to fetch courses: {courses_response.status_code}")
            return []
       
        courses = courses_response.json()
        all_assignments = []
        cutoff_date = datetime.now() + timedelta(days=days_ahead)
       
        for course in courses:
            try:
                assignments_response = requests.get(
                    f"{canvas_url}/courses/{course['id']}/assignments",
                    headers=headers,
                    params={
                        'per_page': 50,
                        'include[]': ['submission']
                    },
                    timeout=10
                )
               
                if assignments_response.status_code == 200:
                    assignments = assignments_response.json()
                    for assignment in assignments:
                        due_at = assignment.get('due_at')
                        submission = assignment.get('submission', {})
                       
                        workflow_state = submission.get('workflow_state', 'unsubmitted')
                        score = submission.get('score')
                        graded = submission.get('graded_at')
                       
                        is_pending = (
                            workflow_state in ['unsubmitted', 'pending_review'] or
                            (workflow_state == 'submitted' and not graded and score is None)
                        )
                       
                        if due_at and is_pending:
                            try:
                                due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                                if due_date >= (datetime.now() - timedelta(days=7)) and due_date <= cutoff_date:
                                    assignment['course_name'] = course.get('name', 'Unknown Course')
                                    assignment['course_code'] = course.get('course_code', 'N/A')
                                    assignment['submission_status'] = workflow_state
                                    all_assignments.append(assignment)
                            except Exception:
                                pass
            except Exception as e:
                print(f"Error fetching assignments for course {course.get('id')}: {e}")
                continue
       
        all_assignments.sort(key=lambda x: x.get('due_at', ''))
        print(f"📋 Found {len(all_assignments)} pending assignments")
        return all_assignments
   
    except Exception as e:
        print(f"Error fetching assignments: {str(e)}")
        return []


@cached(key_prefix='grades_info')
def get_grades_info(course_id, headers, canvas_url, user_id):
    """Fetch grades and submission status"""
    try:
        response = requests.get(
            f'{canvas_url}/courses/{course_id}/assignments',
            headers=headers,
            params={'include[]': ['submission', 'score_statistics']},
            timeout=10
        )
       
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to fetch grades for course {course_id}: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error fetching grades: {str(e)}")
        return []


def get_canvas_context(query, canvas_token, canvas_url, user_id):
    """Enhanced context fetcher with improved general query handling"""
    headers = {'Authorization': f'Bearer {canvas_token}'}
    context = ''
   
    if 'uploaded_file_content' in session:
        context += f"📄 UPLOADED FILE: {session.get('uploaded_file_name', 'Unknown File')}\n"
        context += f"CONTENT:\n{session['uploaded_file_content']}\n\n"

    try:
        query_lower = query.lower()
       
        # Fetch all courses
        courses_response = requests.get(
            f'{canvas_url}/users/self/courses?enrollment_state=active&per_page=100',
            headers=headers,
            timeout=10
        )
        active_courses = courses_response.json() if courses_response.status_code == 200 and isinstance(courses_response.json(), list) else []
       
        past_response = requests.get(
            f'{canvas_url}/users/self/courses?enrollment_state=completed&per_page=100',
            headers=headers,
            timeout=10
        )
        past_courses = past_response.json() if past_response.status_code == 200 and isinstance(past_response.json(), list) else []
       
        all_courses = active_courses + past_courses
       
        # NEW: Check if this is a GENERAL query about courses (not asking about a specific course)
        general_queries = [
            'what are my courses', 'show my courses', 'list my courses', 'my courses',
            'what courses', 'show courses', 'list courses',
            'current courses', 'active courses', 'past courses', 'completed courses',
            'all courses', 'what am i taking', 'what am i enrolled',
            'courses do i have', 'enrolled in', 'taking this semester',
            'what course', 'which course'
        ]
        
        is_general_query = any(phrase in query_lower for phrase in general_queries)
        
        # Always show course lists
        context += '📚 YOUR ACTIVE COURSES:\n'
        for course in active_courses[:15]:
            context += f"- {course.get('name', 'Unknown')} (ID: {course.get('id')}, Code: {course.get('course_code', 'N/A')})\n"
        context += '\n'
       
        if past_courses:
            context += '📜 YOUR PAST COURSES:\n'
            for course in past_courses[:10]:
                context += f"- {course.get('name', 'Unknown')} (Code: {course.get('course_code', 'N/A')})\n"
            context += '\n'
        
        # If it's a general query, skip course detection and return just the lists
        if is_general_query:
            context += "ℹ️ QUERY TYPE: General course list request - no specific course needed\n\n"
            return context
        
        # For specific queries, try to find the target course
        target_course = find_target_course(query_lower, all_courses)
        
        if target_course:
            context += f"🎯 DETECTED COURSE FOR THIS QUERY: {target_course.get('name')} (Code: {target_course.get('course_code', 'N/A')})\n"
            context += f"   This query is specifically about: {target_course.get('name')}\n\n"
        else:
            # Check if query needs a specific course
            needs_specific_course = any(word in query_lower for word in [
                'module', 'week', 'assignment', 'grade', 'score', 'material',
                'content', 'lecture', 'pdf', 'video', 'calculate', 'need'
            ])
            
            if needs_specific_course:
                context += f"⚠️ NO SPECIFIC COURSE DETECTED in query: '{query}'\n"
                context += f"   Please clarify which course you're asking about.\n\n"
            else:
                context += f"ℹ️ GENERAL QUERY - No specific course needed\n\n"
       
        # GRADE CALCULATION - Only if target course exists
        if target_course and any(word in query_lower for word in ['calculate', 'need', 'hd', 'high distinction', 'required grade', 'what grade']):
            context += '🎓 GRADE CALCULATION:\n\n'
            grades_data = get_grades_info(course_id=target_course['id'], headers=headers, canvas_url=canvas_url, user_id=user_id)
            
            if grades_data:
                # Detect target grade from query
                target_grade = 80  # Default to HD
                if 'distinction' in query_lower and 'high' not in query_lower:
                    target_grade = 70
                elif 'credit' in query_lower:
                    target_grade = 60
                elif 'pass' in query_lower:
                    target_grade = 50
                
                # Check for percentage in query
                percentage_match = re.search(r'(\d+)%', query_lower)
                if percentage_match:
                    target_grade = int(percentage_match.group(1))
                
                calc_result = calculate_required_grade(grades_data, target_grade)
                
                if calc_result:
                    context += f"📊 Course: {target_course.get('name')}\n"
                    context += f"🎯 Target Grade: {target_grade}% (HD)\n\n"
                    
                    context += f"📈 CURRENT STATUS:\n"
                    context += f"   Points Earned: {calc_result['current_earned']}/{calc_result['current_possible']}\n"
                    context += f"   Current Grade: {calc_result['current_percentage']}%\n\n"
                    
                    if calc_result['remaining_assignments']:
                        context += f"📝 REMAINING ASSIGNMENTS:\n"
                        for assignment in calc_result['remaining_assignments']:
                            context += f"   - {assignment['name']}: {assignment['points']} points\n"
                        context += f"   Total Remaining Points: {calc_result['remaining_points']}\n\n"
                        
                        context += f"🎯 WHAT YOU NEED:\n"
                        if calc_result['achievable']:
                            context += f"   ✅ To achieve {target_grade}%, you need:\n"
                            context += f"   📊 Average of {calc_result['required_percentage']}% on remaining assignments\n"
                            context += f"   💯 That's {calc_result['points_needed']} more points out of {calc_result['remaining_points']} available\n\n"
                            
                            if calc_result['required_percentage'] > 90:
                                context += f"   ⚠️ Note: You'll need to score very high ({calc_result['required_percentage']}%) on remaining work!\n"
                            elif calc_result['required_percentage'] < 50:
                                context += f"   🎉 Great news! You only need {calc_result['required_percentage']}% on remaining work!\n"
                        else:
                            context += f"   ❌ Unfortunately, achieving {target_grade}% is no longer possible\n"
                            context += f"   📊 Maximum achievable grade: {calc_result['current_percentage'] + calc_result['remaining_points']}%\n"
                    else:
                        context += calc_result.get('message', 'No remaining assignments')
                    
                    context += '\n'
            else:
                context += "⚠️ Could not fetch grade data for this course.\n\n"
       
        # SCHEDULE & CALENDAR
        if any(word in query_lower for word in ['schedule', 'calendar', 'upcoming', 'due', 'deadline', 'when', 'next']):
            context += '📅 YOUR UPCOMING SCHEDULE (Next 2 Weeks):\n\n'
           
            calendar_events = get_calendar_events(headers=headers, canvas_url=canvas_url, user_id=user_id)
            upcoming_assignments = get_upcoming_assignments(headers=headers, canvas_url=canvas_url, user_id=user_id)
           
            all_events = []
           
            for event in calendar_events:
                event_date = event.get('start_at', event.get('created_at', ''))
                if event_date:
                    all_events.append({
                        'type': 'event',
                        'title': event.get('title', 'Unknown Event'),
                        'date': event_date,
                        'course': event.get('context_name', 'Unknown Course'),
                        'description': event.get('description', ''),
                        'url': event.get('html_url', '')
                    })
           
            for assignment in upcoming_assignments:
                submission_status = assignment.get('submission_status', 'unsubmitted')
                status_emoji = '✖' if submission_status == 'unsubmitted' else '⏳'
               
                all_events.append({
                    'type': 'assignment',
                    'title': assignment.get('name', 'Unknown Assignment'),
                    'date': assignment.get('due_at', ''),
                    'course': assignment.get('course_name', 'Unknown Course'),
                    'points': assignment.get('points_possible', 'N/A'),
                    'url': assignment.get('html_url', ''),
                    'status': submission_status,
                    'status_emoji': status_emoji
                })
           
            all_events.sort(key=lambda x: x.get('date', ''))
           
            if all_events:
                current_date = None
                for event in all_events[:25]:
                    try:
                        dt = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
                        date_str = dt.strftime('%A, %B %d, %Y')
                        time_str = dt.strftime('%I:%M %p')
                       
                        if date_str != current_date:
                            context += f"\n📆 {date_str}\n"
                            current_date = date_str
                       
                        if event['type'] == 'assignment':
                            context += f"  {event.get('status_emoji', '📝')} {event['title']} - {event['course']}\n"
                            context += f"     ⏰ Due: {time_str}\n"
                            context += f"     💯 Points: {event.get('points', 'N/A')}\n"
                            context += f"     📊 Status: {event.get('status', 'unknown')}\n"
                            if event.get('url'):
                                context += f"     🔗 Link: {event['url']}\n"
                        else:
                            context += f"  📅 {event['title']} - {event['course']}\n"
                            context += f"     ⏰ Time: {time_str}\n"
                            if event.get('url'):
                                context += f"     🔗 Link: {event['url']}\n"
                        context += '\n'
                    except Exception:
                        pass
            else:
                context += "  ✅ No upcoming deadlines or events in the next 2 weeks.\n"
           
            context += '\n'
       
        # MODULES & CONTENT FETCHING - Only if target course exists
        if target_course and any(word in query_lower for word in ['module', 'week', 'material', 'content', 'lecture', 'learn',
                                                  'topic', 'summarize', 'summary', 'pdf', 'file', 'video']):
            context += '📚 DETAILED COURSE CONTENT:\n'
            
            courses_to_check = [target_course]
            
            for course in courses_to_check:
                try:
                    context += f"\n{'='*60}\n"
                    context += f"📖 COURSE: {course['name']} (Code: {course.get('course_code', 'N/A')})\n"
                    context += f"{'='*60}\n\n"
                    
                    modules_response = requests.get(
                        f"{canvas_url}/courses/{course['id']}/modules?include[]=items",
                        headers=headers,
                        timeout=10
                    )
                    if modules_response.status_code != 200:
                        print(f"Failed to fetch modules for course {course.get('id')}: {modules_response.status_code}")
                        context += f"  ⚠️ Could not fetch modules for this course.\n\n"
                        continue
                    modules = modules_response.json()
                   
                    if isinstance(modules, list) and modules:
                        print(f"📋 Available modules in {course['name']}:")
                        for mod in modules:
                            print(f"   - {mod.get('name', 'Unknown')}")
                        
                        target_modules = modules
                        if 'week' in query_lower or 'module' in query_lower:
                            number_match = re.search(r'(?:week|module|wk|mod)\s*(\d+)', query_lower)
                            if number_match:
                                number = number_match.group(1)
                                target_modules = []
                                
                                for m in modules:
                                    module_name_lower = m.get('name', '').lower()
                                    if any([
                                        f'week {number}' in module_name_lower,
                                        f'week{number}' in module_name_lower,
                                        f'week-{number}' in module_name_lower,
                                        f'wk {number}' in module_name_lower,
                                        f'wk{number}' in module_name_lower,
                                        f'module {number}' in module_name_lower,
                                        f'mod {number}' in module_name_lower,
                                        f'unit {number}' in module_name_lower,
                                        f'lesson {number}' in module_name_lower,
                                        f'chapter {number}' in module_name_lower,
                                        module_name_lower.startswith(f'{number} -'),
                                        module_name_lower.startswith(f'{number}.'),
                                        module_name_lower.startswith(f'{number}:')
                                    ]):
                                        target_modules.append(m)
                                        print(f"✅ Matched module: {m.get('name')}")
                                
                                if target_modules:
                                    print(f"🔍 Filtering for {number_match.group(0)}, found {len(target_modules)} modules")
                                    context += f"  🔍 Showing content for {number_match.group(0).title()}\n\n"
                                else:
                                    print(f"⚠️ No modules found matching {number_match.group(0)}")
                                    context += f"  ⚠️ {number_match.group(0).title()} not found. Available modules:\n"
                                    for mod in modules[:15]:
                                        context += f"     - {mod.get('name', 'Unknown')}\n"
                                    context += "\n"
                                    target_modules = modules[:5]
                        
                        if not target_modules:
                            context += f"  ℹ️ No modules to display.\n\n"
                            continue
                       
                        for module in target_modules[:8]:
                            module_name = module.get('name', 'Unknown Module')
                            module_id = module.get('id', 'N/A')
                            context += f"  📂 {module_name} (Module ID: {module_id})\n"
                           
                            items = module.get('items', [])
                            
                            if not items:
                                context += f"    ℹ️ No items in this module\n\n"
                                continue
                                
                            context += f"    📋 Found {len(items)} items in this module\n\n"
                            
                            for item in items[:20]:
                                item_title = item.get('title', 'Unknown')
                                item_type = item.get('type', 'Unknown')
                                item_url = item.get('html_url', '') or item.get('url', '')
                               
                                context += f"    {'─'*50}\n"
                                context += f"    📌 {item_title} ({item_type})\n"
                                
                                if item_type == 'Page':
                                    page_url = item.get('url') or item.get('html_url')
                                    if page_url:
                                        print(f"📄 Fetching page: {item_title}")
                                        page_content = get_page_content(course_id=course['id'], page_url=page_url, headers=headers, canvas_url=canvas_url, user_id=user_id)
                                        if page_content and page_content.get('content'):
                                            context += f"\n    📄 PAGE CONTENT:\n"
                                            context += f"    {'-'*50}\n"
                                            context += f"{page_content['content']}\n"
                                            context += f"    {'-'*50}\n"
                                            
                                            if page_content.get('urls'):
                                                context += f"    🔗 Embedded links: {', '.join(page_content['urls'][:10])}\n"
                                        else:
                                            context += f"    ⚠️ Could not fetch page content\n"
                                        
                                        if item_url:
                                            context += f"    🔗 Page URL: {item_url}\n"
                                
                                elif item_type == 'File':
                                    file_id = item.get('content_id')
                                    if file_id:
                                        try:
                                            file_response = requests.get(
                                                f"{canvas_url}/files/{file_id}",
                                                headers=headers,
                                                timeout=10
                                            )
                                            if file_response.status_code == 200:
                                                file_data = file_response.json()
                                                file_name = file_data.get('filename', '')
                                                file_url = file_data.get('url', '')
                                                mime_type = file_data.get('content-type', '')
                                               
                                                context += f"    📎 File: {file_name}\n"
                                                context += f"    🔗 Download: {item_url}\n"
                                               
                                                if 'pdf' in mime_type.lower() or file_name.lower().endswith('.pdf'):
                                                    context += f"\n    📄 EXTRACTING PDF CONTENT...\n"
                                                    pdf_text = extract_pdf_text(pdf_url=file_url, headers=headers, user_id=user_id)
                                                    if pdf_text:
                                                        context += f"    {'-'*50}\n"
                                                        context += f"    PDF CONTENT:\n"
                                                        context += f"{pdf_text}\n"
                                                        context += f"    {'-'*50}\n"
                                                    else:
                                                        context += f"    ⚠️ Could not extract PDF text\n"
                                        except Exception as e:
                                            context += f"    ⚠️ Error processing file: {str(e)}\n"
                                
                                elif item_type == 'ExternalUrl':
                                    external_url = item.get('external_url', item_url)
                                    context += f"    🔗 Link: {external_url}\n"
                                    
                                    if external_url and ('youtube.com' in external_url or 'youtu.be' in external_url):
                                        context += f"\n    🎥 FETCHING VIDEO TRANSCRIPT...\n"
                                        transcript = get_video_transcript(video_url=external_url, user_id=user_id)
                                        if transcript:
                                            context += f"    {'-'*50}\n"
                                            context += f"    VIDEO TRANSCRIPT:\n"
                                            context += f"{transcript[:25000]}\n"
                                            context += f"    {'-'*50}\n"
                                        else:
                                            context += f"    ⚠️ Transcript not available\n"
                                
                                elif item_type == 'Assignment':
                                    assignment_id = item.get('content_id')
                                    if assignment_id:
                                        try:
                                            assign_response = requests.get(
                                                f"{canvas_url}/courses/{course['id']}/assignments/{assignment_id}",
                                                headers=headers,
                                                timeout=10
                                            )
                                            if assign_response.status_code == 200:
                                                assign_data = assign_response.json()
                                                description = assign_data.get('description', '')
                                                due_at = assign_data.get('due_at', 'No due date')
                                                points = assign_data.get('points_possible', 'N/A')
                                                
                                                context += f"    📝 Assignment Details:\n"
                                                context += f"       Due: {due_at}\n"
                                                context += f"       Points: {points}\n"
                                                context += f"    🔗 URL: {item_url}\n"
                                                
                                                if description:
                                                    clean_desc = re.sub('<[^<]+?>', '', description)
                                                    clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()
                                                    context += f"\n    📋 ASSIGNMENT DESCRIPTION:\n"
                                                    context += f"    {'-'*50}\n"
                                                    context += f"{clean_desc[:10000]}\n"
                                                    context += f"    {'-'*50}\n"
                                        except Exception as e:
                                            context += f"    ⚠️ Could not fetch assignment details\n"
                                    else:
                                        context += f"    🔗 URL: {item_url}\n"
                                
                                elif item_type == 'ExternalTool':
                                    context += f"    🔧 External Tool\n"
                                    context += f"    🔗 Link: {item_url}\n"
                                
                                elif item_type == 'Quiz':
                                    context += f"    📝 Quiz\n"
                                    context += f"    🔗 Link: {item_url}\n"
                                
                                elif item_type == 'Discussion':
                                    context += f"    💬 Discussion\n"
                                    context += f"    🔗 Link: {item_url}\n"
                                
                                else:
                                    context += f"    🔗 URL: {item_url}\n"
                                
                                context += "\n"
                    
                    else:
                        context += f"  ℹ️ No modules found for this course.\n\n"
                        
                except Exception as e:
                    print(f"Error fetching content: {str(e)}")
                    context += f"  ⚠️ Error: {str(e)}\n\n"
            
            context += '\n'
       
        # GRADES & SUBMISSIONS - Only if target course exists
        if target_course and any(word in query_lower for word in ['grade', 'score', 'mark', 'submission', 'submitted', 'progress']):
            context += '📊 YOUR GRADES & SUBMISSIONS:\n'
            courses_to_check = [target_course]
           
            for course in courses_to_check:
                grades_data = get_grades_info(course_id=course['id'], headers=headers, canvas_url=canvas_url, user_id=user_id)
                if grades_data:
                    context += f"\n{course['name']}:\n"
                    for assignment in grades_data[:10]:
                        name = assignment.get('name', 'Unknown')
                        points = assignment.get('points_possible', 'N/A')
                        submission = assignment.get('submission', {})
                       
                        if submission:
                            score = submission.get('score', 'Not graded')
                            status = submission.get('workflow_state', 'not submitted')
                           
                            context += f"  📝 {name}\n"
                            context += f"     Score: {score}/{points} | Status: {status}\n"
                        else:
                            context += f"  📝 {name} (Not submitted, {points} points)\n"
            context += '\n'
       
        return context
   
    except Exception as e:
        return f"Error fetching Canvas data: {str(e)}"


def call_gemini(context, api_key, conversation_history):
    """Enhanced AI assistant with grade calculation support"""
    model_name = 'gemini-1.5-pro'
   
    if os.path.exists('gemini_model.txt'):
        try:
            with open('gemini_model.txt', 'r') as f:
                saved_model = f.read().strip()
                if saved_model:
                    model_name = saved_model
                    print(f"📖 Using saved model: {model_name}")
        except Exception as e:
            print(f"⚠️ Error reading model file: {e}")

    system_prompt = f"""You are a friendly, helpful Canvas Learning Assistant that creates EASY-TO-READ, STUDENT-FRIENDLY study materials and helps with grade calculations.

STUDENT'S CANVAS DATA:
{context}

CRITICAL INSTRUCTIONS:

1.  **File Feedback**:
    - If the user uploads a file (indicated by "📄 UPLOADED FILE"), they want feedback on it.
    - Your primary task is to analyze the file content and provide constructive feedback.
    - For essays or reports, check for clarity, structure, and grammar.
    - For code files, check for correctness, style, and efficiency.
    - Provide specific examples from the text to support your feedback.
    - Be encouraging and focus on helping the student improve.

2.  **Practice Question Generation**:
    - If the user asks for "practice questions", "quiz questions", "sample questions", or similar, you MUST generate relevant practice questions.
    - Use the "📚 DETAILED COURSE CONTENT" (especially "📄 PAGE CONTENT", "📄 PDF CONTENT", and "🎥 VIDEO TRANSCRIPT") to create the questions.
    - Generate a mix of question types (multiple choice, true/false, short answer).
    - Provide the correct answer for each question.
    - Make the questions challenging but fair, based on the provided material.

3.  **Study Plan Generation**:
    - If the user asks for a "study plan", "study schedule", or something similar, you MUST generate a structured, actionable study plan.
    - Use the "📅 YOUR UPCOMING SCHEDULE" and "📚 DETAILED COURSE CONTENT" from the user's Canvas data to create the plan.
    - The plan should be broken down by day or week.
    - For each day/week, list specific, manageable tasks (e.g., "Review 'Lecture 3: Python Basics'", "Complete 'Assignment 1: Hello World'").
    - Prioritize tasks based on due dates.
    - Make the plan encouraging and realistic.

4. COURSE DETECTION:
   - Look for "🎯 DETECTED COURSE FOR THIS QUERY" - this is the course to focus on
   - Look for "ℹ️ QUERY TYPE: General course list request" - this means they want course lists
   - ONLY use content from the detected course
   - If "⚠️ NO SPECIFIC COURSE DETECTED", ask which course they mean

5. **PARETO PRINCIPLE SUMMARIES (80/20 RULE)** - ALWAYS USE THIS FOR SUMMARIES:
   When summarizing ANY content (modules, lectures, PDFs, videos, pages), you MUST apply the Pareto Principle:
   
   **Focus on the 20% of content that gives 80% of the value**
   
   Structure summaries like this:
   
   # 📚 [Topic] Summary (Pareto Method)
   
   ## 🎯 Core Concepts (The 20% You MUST Know)
   
   These are the MOST IMPORTANT concepts that will give you 80% of the understanding:
   
   ### 1. [Most Critical Concept]
   **Why it matters:** [Explain real-world importance]
   **Key takeaway:** [One sentence summary]
   **What you need to remember:** [Specific actionable points]
   
   ### 2. [Second Most Critical Concept]
   [Same structure]
   
   ---
   
   ## 📖 Supporting Details (The Other 80%)
   
   Once you master the core, here are the supporting details:
   
   - **[Topic A]**: [Brief explanation]
   - **[Topic B]**: [Brief explanation]
   
   ---
   
   ## 🔗 All Resources & Links
   
   **PRIMARY RESOURCES** (Study these first):
   - 📄 [Resource Name] - [Direct clickable URL from Canvas data]
   - 🎥 [Video Title] - [Direct clickable URL from Canvas data]
   - 📁 [PDF Name] - [Direct clickable URL from Canvas data]
   
   **SUPPLEMENTARY RESOURCES**:
   - 📝 [Additional Resource] - [URL]
   
   ---
   
   ## ✅ Quick Action Checklist
   
   To master this topic (Pareto style):
   1. ☐ Read/watch the PRIMARY resources above (30 mins)
   2. ☐ Understand the [X] core concepts listed
   3. ☐ Do [specific practice activity]
   4. ☐ Review supporting details if time permits
   
   ---
   
   **CRITICAL REQUIREMENTS FOR RESOURCE LINKS:**
   - ALWAYS extract and include ALL URLs found in the Canvas data
   - Look for URLs in: "🔗 Link:", "🔗 Page URL:", "🔗 Download:", "🔗 URL:", "🔗 Embedded links:"
   - Make EVERY resource clickable with full URL
   - Organize links by priority (most important first)
   - Label each link clearly (what it is, why it's useful)
   - Never say "refer to Canvas" - always provide the direct link
   
   **PARETO PRIORITY RULES:**
   1. Identify the 3-5 MOST CRITICAL concepts that explain 80% of the topic
   2. Put these at the TOP of your summary
   3. Explain WHY each core concept matters (real-world application)
   4. Keep supporting details brief and organized
   5. Always include actionable next steps

6. GRADE CALCULATION SUPPORT:
   - If you see "🎓 GRADE CALCULATION:" section, explain it clearly
   - Break down what grades they need on remaining assignments
   - Make it easy to understand with clear examples
   - If they need impossibly high grades (>95%), warn them gently
   - If the target is easily achievable (<50% needed), congratulate them
   - Always show the calculation breakdown in a friendly way

7. CONTENT EXTRACTION:
   When you see these sections in the Canvas data, EXTRACT ALL DETAILS:
   📄 PAGE CONTENT: Contains lecture notes and explanations
   📄 PDF CONTENT: Contains slides and detailed materials
   🎥 VIDEO TRANSCRIPT: Contains spoken lecture content
   📋 ASSIGNMENT DESCRIPTION: Contains task requirements
   🔗 ALL URLS: Extract every single URL and make them clickable in your response

8. USER-FRIENDLY FORMAT (VERY IMPORTANT):

   Write in a NATURAL, CONVERSATIONAL tone like you're explaining to a friend.
   Use SHORT paragraphs (2-3 sentences max).
   Add plenty of white space and visual breaks.
   Use simple language before technical terms.

   For grade calculations, use this format:

   # 🎓 Grade Calculation for [Course Name]

   ## 📊 Your Current Situation

   Right now, you have:
   - **Current Grade:** X%
   - **Points Earned:** X out of Y
   - **Target Grade:** Z% (HD/D/C/P)

   ---

   ## 📝 What's Left to Do

   You still have these assignments:
   - **[Assignment 1]**: X points
   - **[Assignment 2]**: Y points
   - **Total Remaining**: Z points

   ---

   ## 🎯 What You Need

   To get your target grade of Z%, here's what you need:

   **Average Required:** X% across all remaining assignments

   **In points:** You need Y more points out of Z available

   ### 💡 What This Means:

   [Explain in simple terms what this percentage means - is it achievable? Easy? Challenging?]

   ### 📋 Example Breakdown:

   If assignments are worth equal points, you'd need:
   - Assignment 1: X/Y points (Z%)
   - Assignment 2: X/Y points (Z%)

   ---

   ## 💪 Tips for Success

   [Provide 2-3 helpful, encouraging tips based on the calculation]

9. WRITING STYLE RULES:
   ✅ DO:
   - Write like you're explaining to a friend
   - Use everyday analogies and examples
   - Break long explanations into short chunks
   - Add emojis for visual organization (📚 🎯 💡 🔹 ⚠️ ✅)
   - Use "you" and "your" to make it personal
   - Explain technical terms immediately when you use them
   - Add "In simple terms:" or "Think of it like:" sections
   - Be encouraging and positive, especially about grades
   - ALWAYS include clickable resource links at the end of summaries
   - Use Pareto Principle (80/20) for ALL summaries
   
   ❌ DON'T:
   - Use dense paragraphs (max 3 sentences per paragraph)
   - List things without explanations
   - Use jargon without defining it first
   - Create walls of text
   - Make it feel like a textbook
   - Use overly formal language
   - Be discouraging about grades (always be supportive)
   - Forget to include resource links
   - Create summaries without Pareto structure

10. STRUCTURE REQUIREMENTS:
   - Use horizontal rules (---) to separate major sections
   - Add visual hierarchy with emojis (🔹 for subsections)
   - Keep paragraphs SHORT (2-3 sentences maximum)
   - Add white space between concepts
   - Use **bold** for important terms
   - Use bullet points for lists, but explain each point
   - Always end summaries with a "🔗 All Resources & Links" section

REMEMBER: Your goal is to make learning EASY and ENJOYABLE using the Pareto Principle (focus on the 20% that matters most), provide ALL clickable resource links, and help students understand exactly what they need to achieve their grade goals. Always be encouraging and supportive!"""

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}'
   
    payload = {
        'contents': conversation_history,
        'system_instruction': {
            'parts': [{'text': system_prompt}]
        },
        'generationConfig': {
            'temperature': 0.4,
            'maxOutputTokens': 15000
        }
    }
   
    response = requests.post(url, json=payload, timeout=45)
   
    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")
   
    data = response.json()
    return data['candidates'][0]['content']['parts'][0]['text']


if __name__ == '__main__':
    app.run(debug=True, port=5001)