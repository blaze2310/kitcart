const detailsByCategory: Record<string, [string, string, string]> = {
  "Website & Landing Page Templates": ["A responsive page layout with a hero, content sections and a call to action.", "Desktop and mobile layout examples", "Editable page sections"],
  "UI Kits & Design Files": ["A starting point for building consistent screen layouts and testing an interface before development.", "Reusable interface components", "Example screens and design patterns"],
  "Downloadable Workflow Files": ["A sample automation you can inspect to see where inputs enter, how they are processed and where outputs go.", "Example workflow steps", "Setup and input notes"],
  "Shared Automation Templates": ["A reusable process map for connecting common tools with less manual handoff work.", "Workflow blueprint", "Example trigger and action sequence"],
  "Automation Scripts": ["A small utility concept for reducing repetitive file or data work.", "Example inputs and outputs", "Usage and configuration notes"],
  "Editable Presentation Templates": ["A slide system with a consistent visual hierarchy for telling a story with text, images and figures.", "Editable slide layouts", "Example content and chart slides"],
  "Professional Document Templates": ["A structured document concept to make career materials easier to draft, revise and tailor.", "Editable document structure", "Example sections and writing prompts"],
  "BI Dashboard Templates": ["A business reporting layout that brings headline metrics, trends and breakdowns into one view.", "Sample KPI cards and charts", "Illustrative business data"],
  "Code-Based Dashboards": ["A dashboard starting point for developers who want to build interactive views from their own data.", "Example dashboard interface", "Sample data and visual components"],
  "Trading Indicators & Signals": ["An educational charting concept for studying historical price or volume patterns using simulated data.", "Illustrative market charts", "Example indicator settings"],
  "Trading Strategies & Bots": ["A simulation concept for experimenting with trading rules without connecting to a live account.", "Paper-trading scenarios", "Example logs and performance views"],
  "Ebooks & Instruction Guides": ["A practical learning resource organised around examples, short exercises and actionable next steps.", "Chapter or module outline", "Examples and practice tasks"],
  "AI Prompt Packs": ["A collection of example prompts to help turn a creative brief into a consistent set of scenes or outputs.", "Editable prompt examples", "Ideas for varying style and composition"],
  "Spreadsheet & Calculator Templates": ["A spreadsheet concept with clear inputs, calculations and outputs for day-to-day planning.", "Sample input sheet", "Illustrative formulas and results"],
  "Editable Marketing Design Templates": ["A set of editable layouts that can be adapted for a campaign without starting from a blank canvas.", "Example campaign layouts", "Replaceable copy and visual elements"],
  "Marketing Content & Copy Kits": ["A writing kit with example messaging structures you can adapt to your audience and channel.", "Example copy and prompts", "Reusable messaging framework"],
  "2D Graphic Assets & Mockups": ["A visual asset concept for illustrating a project or presenting creative work in context.", "Sample graphics and compositions", "Example presentation layouts"],
  "Fonts, Presets & LUTs": ["A visual treatment concept showing how typography or colour choices change the look of a project.", "Before-and-after or specimen previews", "Example use cases"],
  "3D Models": ["A 3D asset concept for assembling a scene, visual mockup or presentation.", "Sample model views", "Illustrative scene composition"],
  "Code Snippets & Libraries": ["A small developer resource designed around reusable solutions to common implementation tasks.", "Example snippets", "Usage patterns and sample inputs"],
  "Starter Projects & Developer Tools": ["A starter concept for setting up a repeatable development or testing workflow.", "Example project structure", "Configuration and workflow notes"],
  "Workspace & Database Templates": ["A workspace concept with related records and views that make information easier to organise.", "Sample database fields and views", "Illustrative records and workflow"],
  "No-Code App Templates": ["A prototype showing how screens, forms and data can fit together in a no-code app.", "Example app screens", "Sample record and form flows"],
};

export function getProductDetails({ id, subcategory }: { id: number; subcategory: string }) {
  const [description, ...includes] = detailsByCategory[subcategory] ??
    ["An illustrative digital product from the KitCart demo catalogue.", "Product artwork", "Sample workflow video"];
  return { description, includes, rating: (41 + (id * 7) % 10) / 10, reviews: 6 + (id * 17) % 84 };
}
