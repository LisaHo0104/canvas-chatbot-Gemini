import '../src/app/globals.css'
import type { Preview } from '@storybook/react'

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    a11y: { disable: false },
  },
}

export default preview