# NICU Overtime Suite (Expo)

A React Native / Expo adaptation of the NICU overtime calculators covering:

- 📊 Regular Gregorian months
- 🌙 Ramadan-only months
- 🔄 Mixed periods (Ramadan + non-Ramadan)

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Expo development server:
   ```bash
   npm start
   ```
3. Open the app in the Expo Go client or a simulator (Android/iOS/web) from the CLI prompts.

## Notes

- All calculations mirror the original HTML logic: baselines, vacations, coverage patterns, and on-call hours are recomputed live as you edit fields.
- Tabs at the top let you switch between the three calculators.
