import { Events } from "@/types/events"

export const events: Events = [
  {
    year: 2024,
    periodType: "Q",
    periodNumber: 1,
    isChecked: true,
    events: [
      { title: "Complete Module 1: Introduction", isChecked: true },
      { title: "Finish Assignment 1", isChecked: true },
      { title: "Review Week 1-2 materials", isChecked: true },
    ],
  },
  {
    year: 2024,
    periodType: "Q",
    periodNumber: 2,
    isChecked: true,
    events: [
      { title: "Complete Module 2: Core Concepts", isChecked: true },
      { title: "Submit Assignment 2", isChecked: true },
      { title: "Midterm exam preparation", isChecked: false },
    ],
  },
  {
    year: 2024,
    periodType: "Q",
    periodNumber: 3,
    isChecked: false,
    events: [
      { title: "Complete Module 3: Advanced Topics", isChecked: false },
      { title: "Work on final project", isChecked: false },
      { title: "Review all course materials", isChecked: false },
    ],
  },
  {
    year: 2024,
    periodType: "Q",
    periodNumber: 4,
    isChecked: false,
    events: [
      { title: "Final exam preparation", isChecked: false },
      { title: "Submit final project", isChecked: false },
      { title: "Complete course review", isChecked: false },
    ],
  },
]
