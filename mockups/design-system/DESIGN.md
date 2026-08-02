---
name: Laksanasoft Corporate Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#00658d'
  on-secondary: '#ffffff'
  secondary-container: '#41befd'
  on-secondary-container: '#004b69'
  tertiary: '#0e1f32'
  on-tertiary: '#ffffff'
  tertiary-container: '#243448'
  on-tertiary-container: '#8c9cb5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#c6e7ff'
  secondary-fixed-dim: '#81cfff'
  on-secondary-fixed: '#001e2d'
  on-secondary-fixed-variant: '#004c6b'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1rem
  stack-gap: 0.75rem
  section-gap: 1.5rem
  card-padding: 1rem
  inline-gutter: 0.5rem
---

## Brand & Style

This design system is engineered for a high-stakes corporate banking environment, prioritizing clarity, efficiency, and institutional trust. The aesthetic follows a **Corporate Modern** approach—balancing the precision of enterprise software with the fluid, tactile feel of premium consumer fintech. 

The visual narrative focuses on "Architectural Stability." This is achieved through a structured grid, purposeful whitespace, and a sophisticated color palette that signals reliability. The interface avoids unnecessary decorative elements, ensuring that complex financial data remains the primary focus. Every interaction should feel intentional, secure, and instantaneous.

## Colors

The palette is anchored by **Corporate Deep Blue**, representing stability and the heritage of financial institutions. **Modern Cyan** is utilized sparingly as an action color to draw attention to primary tasks like "Bayar" (Pay) or "Kirim" (Send).

- **Primary:** Use for headers, primary buttons, and active navigation states.
- **Secondary:** Use for interactive accents, progress bars, and illustrative icons.
- **Surface:** The background is a crisp `neutral-50` (#F8FAFC) to differentiate from the pure white (`#FFFFFF`) cards and modals.
- **Semantic:** Status colors follow industry standards but are slightly desaturated to maintain the professional tone.

## Typography

**Inter** is the sole typeface for this design system, chosen for its exceptional legibility in data-heavy environments and its neutral, systematic character.

- **Numerics:** For account balances and transaction amounts, ensure the use of tabular lining figures (if supported) to maintain vertical alignment in lists.
- **Hierarchy:** Use `headline-md` for screen titles and `label-md` for section headers or small metadata descriptors. 
- **Readability:** Maintain a minimum contrast ratio of 4.5:1 for all body text against surface backgrounds to ensure accessibility for all corporate users.

## Layout & Spacing

The design system utilizes a **4px baseline grid** to ensure mathematical harmony between all elements. 

- **Mobile Grid:** A 4-column fluid grid with 16px (`1rem`) side margins.
- **Vertical Rhythm:** Elements within a card should follow a `stack-gap` of 12px. Larger sections or distinct card groups should be separated by a `section-gap` of 24px.
- **Alignment:** All currency values should be right-aligned in tables and lists to allow for easy scanning of decimal places and magnitudes.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Soft Ambient Shadows** to create a sense of organized hierarchy.

1.  **Level 0 (Base):** The `neutral-50` background.
2.  **Level 1 (Card):** White surfaces with a very subtle, large-radius shadow (e.g., `0px 4px 20px rgba(0, 0, 0, 0.05)`). This level is used for the primary content containers.
3.  **Level 2 (Active/Floating):** Used for bottom sheets and modals. These utilize a more pronounced shadow and a backdrop dimming effect (40% opacity black) to focus the user’s attention on the transaction confirmation.

## Shapes

The shape language is defined as **Rounded**, providing a modern, approachable feel while maintaining professional discipline.

- **Primary Containers:** 12px (`0.75rem`) corner radius for cards and main input fields.
- **Small Elements:** 8px (`0.5rem`) for buttons and tags/chips.
- **Icons:** Use a consistent 2px stroke weight with slightly rounded joins to match the component geometry.

## Components

### Buttons
- **Primary:** Deep Blue background with white text. High-contrast and substantial (minimum height 48px for touch targets).
- **Secondary:** Transparent background with Deep Blue border and text. Used for "Batal" (Cancel) or "Unduh" (Download) actions.

### Invoices & Lists
- **Invoice Items:** Use a "Surface" card layout. The left side contains the vendor name and date (`body-md`), while the right side displays the amount in `headline-md` weight.
- **Status Badges:** Use a "Pill" shape with a low-opacity background of the status color and a high-opacity text color (e.g., Success: Light green background, Dark green text).

### Input Fields
- **State:** Labels should remain visible above the input field even when focused (Floating label style). Use a 2px Modern Cyan border highlight when the field is active.
- **Numeric Inputs:** Specifically for "Nominal Transfer," use a larger font size to prevent errors.

### Account Cards
- Featured at the top of the "Beranda" (Home). Use a subtle gradient of Primary Deep Blue to represent the "Premium" nature of the account, with the balance clearly legible in white.