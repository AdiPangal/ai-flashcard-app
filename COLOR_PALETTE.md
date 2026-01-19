# Color Palette Reference

This document lists all hex color codes used throughout the application to help with implementing light mode.

## Primary Colors

### Brand Blue
- **#1374b9** - Primary brand blue (buttons, active states, icons, progress bars, links)
  - Used in: quizQuestion, quizReview, quizResults, quizHome, quizProgressBar, flashcardHome, history, settings, buttons, login, signup, resetPassword, passwordRecovery, etc.
  - Usage: Primary buttons, active states, selected items, progress indicators, link text

- **#0d5a8a** - Darker blue (pressed button state)
  - Used in: quizQuestion, quizReview, flashcardHome, history
  - Usage: Pressed/active button background

- **#1a2a3a** - Dark blue-gray (selected quiz type button)
  - Used in: quizQuestionTypes
  - Usage: Selected state background


## Background Colors

### Dark Backgrounds
- **#121212** - Main background (darkest)
  - Used in: Almost all screens
  - Usage: Main container background

- **#1e1e1e** - Secondary background (cards, containers)
  - Used in: quizQuestion, quizReview, quizResults, quizHome, flashcardHome, history, settings, buttons, etc.
  - Usage: Card backgrounds, button backgrounds, container backgrounds

- **#1a1a1a** - Tertiary background (input fields, search bars)
  - Used in: history, flashcardHome
  - Usage: Input field backgrounds, search bar backgrounds

- **#2a2a2a** - Lighter dark background
  - Used in: history, horizontalLine
  - Usage: Secondary containers, divider lines

- **#3a3a3a** - Border/divider color
  - Used in: quizQuestion, quizReview, quizResults, quizHome, flashcardHome, history, settings, buttons, etc.
  - Usage: Borders, dividers, inactive states

- **#464646** - Active button background (darker gray)
  - Used in: flashcardHome, history
  - Usage: Active button state

## Text Colors

### Primary Text
- **#e0e0e0** - Primary text color (light gray)
  - Used in: Almost all screens
  - Usage: Main text, button text, labels

- **#6b6b6b** - Secondary text color (medium gray)
  - Used in: quizQuestion, quizReview, quizResults, quizHome, flashcardHome, history, settings, etc.
  - Usage: Secondary text, disabled states, placeholders, icons

- **#a0a0a0** - Tertiary text color (lighter gray)
  - Used in: history
  - Usage: Subtle text, icons

## Status Colors

### Success/Correct
- **#4caf50** - Green (success, correct answers) - Note: #4CAF50 is the same color (case-insensitive)
  - Used in: quizReview, quizResults, resetPassword, passwordRecovery
  - Usage: Correct answer indicators, success states, success messages

- **#1a3a1a** - Dark green background
  - Used in: quizReview
  - Usage: Correct answer box background

### Error/Incorrect
- **#f44336** - Red (error, incorrect answers)
  - Used in: quizReview, quizResults, login, signup, resetPassword, passwordRecovery, fileList
  - Usage: Incorrect answer indicators, error states, error messages
  - Note: #FF5252 has been replaced with #f44336 for consistency

- **#3a1a1a** - Dark red background
  - Used in: quizReview
  - Usage: Incorrect answer box background

## Special Purpose Colors

### Question Indicator Dots
- **#1374b9** - Active question dot (blue)
- **#4caf50** - Correct answer dot (green)
- **#f44336** - Incorrect answer dot (red)
- **#3a3a3a** - Unanswered/default dot (gray)

### Opacity/Disabled States
- Various colors with opacity: 0.5, 0.6 applied via StyleSheet opacity property

## Color Usage by Component Type

### Buttons
- Primary: #1374b9 (background), #0d5a8a (pressed)
- Secondary: #1e1e1e (background), #2a2a2a (active)
- Disabled: #1e1e1e (background), #6b6b6b (text)

### Input Fields
- Background: #1a1a1a, #1e1e1e
- Border: #3a3a3a, #1374b9 (focused)
- Text: #e0e0e0
- Placeholder: #6b6b6b

### Cards/Containers
- Background: #1e1e1e
- Border: #3a3a3a

### Text
- Primary: #e0e0e0
- Secondary: #6b6b6b
- Tertiary: #a0a0a0
- Links: #1374b9 (replaced #1e88e5)

## Files with Most Color Usage

1. **history.tsx** - 30+ color instances
2. **flashcardHome.tsx** - 25+ color instances
3. **quizQuestion.tsx** - 20+ color instances
4. **quizReview.tsx** - 25+ color instances
5. **quizResults.tsx** - 15+ color instances

## Recommendations for Light Mode

### Color Mapping Suggestions

**Dark → Light Backgrounds:**
- #121212 → #ffffff (main background)
- #1e1e1e → #f5f5f5 (card background)
- #1a1a1a → #fafafa (input background)
- #2a2a2a → #e0e0e0 (secondary container)
- #3a3a3a → #bdbdbd (borders)

**Dark → Light Text:**
- #e0e0e0 → #212121 (primary text)
- #6b6b6b → #757575 (secondary text)
- #a0a0a0 → #9e9e9e (tertiary text)

**Brand Colors (keep consistent):**
- #1374b9 (primary blue - keep)
- #0d5a8a (pressed blue - keep)
- #4caf50 (success green - keep)
- #f44336 (error red - keep)

**Status Colors (may need adjustment):**
- Success backgrounds: #1a3a1a → #e8f5e9
- Error backgrounds: #3a1a1a → #ffebee
