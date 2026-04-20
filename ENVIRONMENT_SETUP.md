# Environment Setup

## API Keys Setup

This project requires a Google Gemini API key to function properly.

### Steps to set up your API key:

1. **Get your API key from Google AI Studio:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key or use an existing one

2. **Create the environment file:**
   ```bash
   # Copy the template
   cp .env.local.template .env.local

   # Edit .env.local and replace YOUR_API_KEY_HERE with your actual API key
   # VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Alternative setup scripts:**
   - Run `setup-api-key.ps1` (PowerShell script)
   - Or run `create-env.bat` (Batch script)
   - These scripts will prompt you to enter your API key

### Important Security Notes:

- Never commit your actual API key to version control
- The `.env.local` file is automatically ignored by git
- Keep your API key secure and rotate it regularly
- Do not share your API key with anyone

### Files that should not contain real API keys:

- `setup-api-key.ps1`
- `create-env.bat`
- `.env.local.template`
- `.env.local` (when committed)

All these files now contain placeholder text `YOUR_API_KEY_HERE` instead of real keys.