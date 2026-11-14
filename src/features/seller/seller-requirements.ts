export const deliverableHints: Record<string, string> = {
  "Website & Landing Page Templates": "Website source ZIP, such as HTML/CSS/JS or React. Specify the stack and build requirements.",
  "UI Kits & Design Files": "Editable design file, supported copy link or asset bundle. Specify the design app and version.",
  "Downloadable Workflow Files": "Importable n8n JSON or Make blueprint. List integrations and remove credentials.",
  "Shared Automation Templates": "Supported copy link or a reproducible setup package. List required integrations.",
  "Automation Scripts": "Runnable scripts with dependencies. Specify the runtime, version and inputs.",
  "Editable Presentation Templates": "Editable PPTX or supported copy link. List fonts or animations where relevant.",
  "Professional Document Templates": "Editable DOCX or supported document copy link. List any required fonts or apps.",
  "BI Dashboard Templates": "Native PBIX, TWBX or comparable project. Specify software, version and expected data structure.",
  "Code-Based Dashboards": "Source ZIP with dependencies and any promised sample data. Specify runtime and setup requirements.",
  "Trading Indicators & Signals": "Supported indicator source or preset. State the platform and assumptions.",
  "Trading Strategies & Bots": "Supported strategy or bot files and configuration. State the platform and assumptions.",
  "Ebooks & Instruction Guides": "Full PDF or EPUB, plus any promised worksheets.",
  "AI Prompt Packs": "Organized TXT, Markdown, CSV, JSON or ZIP. List any applicable model requirements.",
  "Spreadsheet & Calculator Templates": "Editable XLSX, ODS or supported Google Sheets copy link. Specify the spreadsheet app.",
  "Editable Marketing Design Templates": "Editable source files or supported Canva/Figma copy link. Specify the editing app.",
  "Marketing Content & Copy Kits": "Copy files, plus any promised calendars or examples.",
  "2D Graphic Assets & Mockups": "Source or export bundle such as SVG, PNG or PSD. Specify software where relevant.",
  "Fonts, Presets & LUTs": "Installable OTF, TTF, CUBE or similar files. Specify compatible software.",
  "3D Models": "GLB, BLEND, FBX or similar, with any promised textures. Specify the target tools.",
  "Code Snippets & Libraries": "Source or package with usage examples. Specify runtime, dependencies and version.",
  "Starter Projects & Developer Tools": "Full source or tool with dependencies and configuration. State the runtime and prerequisites.",
  "Workspace & Database Templates": "Supported duplication link or structured export. Specify the target workspace.",
  "No-Code App Templates": "Supported clone link or export. State the platform and any schema or subscription requirements.",
};

export const checklist = [
  ["Your final digital product", "The file, bundle or supported template the buyer will receive."],
  ["A product description or README", "What it does, who it’s for and what the buyer gets."],
  ["An installation or usage guide", "How to open, edit, import, install or use the product."],
  ["At least one real product image", "Show the actual product. Extra images and a video are optional. A video does not replace the cover image."],
] as const;

