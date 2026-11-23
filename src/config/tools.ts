export type ToolCategory =
  | 'Image, Media & Graphics'
  | 'PDF & Document Processing'
  | 'Developer, API & Code'
  | 'Cryptography & Security'
  | 'Financial & Calculators'
  | 'Text, Writing & SEO';

export interface MicroTool {
  id: number;
  slug: string;
  name: string;
  category: ToolCategory;
  tech: string;
  description: string;
}

export const CATEGORIES: ToolCategory[] = [
  'Image, Media & Graphics',
  'PDF & Document Processing',
  'Developer, API & Code',
  'Cryptography & Security',
  'Financial & Calculators',
  'Text, Writing & SEO',
];

export const TOOLS: MicroTool[] = [
  // 1–20: Image, Media & Graphics
  { id: 1, slug: 'jpg-png-to-webp-converter', name: 'JPG/PNG to WEBP Converter', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Convert images locally without uploading to server' },
  { id: 2, slug: 'svg-optimizer-cleaner', name: 'SVG Optimizer & Cleaner', category: 'Image, Media & Graphics', tech: 'DOM / SVG Parser', description: 'Minify and strip metadata from SVG graphics' },
  { id: 3, slug: 'image-background-remover', name: 'Image Background Remover', category: 'Image, Media & Graphics', tech: 'Canvas Chroma Engine', description: 'In-browser segmentation and color-key background removal' },
  { id: 4, slug: 'client-side-image-compressor', name: 'Client-Side Image Compressor', category: 'Image, Media & Graphics', tech: 'HTML5 Canvas', description: 'Compress JPG/PNG files using HTML5 Canvas quality scaling' },
  { id: 5, slug: 'favicon-app-icon-generator', name: 'Favicon & App Icon Generator', category: 'Image, Media & Graphics', tech: 'Canvas API / JSZip', description: 'Generate multi-size favicons and ZIP export' },
  { id: 6, slug: 'css-glassmorphism-neumorphism-builder', name: 'CSS Glassmorphism & Neumorphism Builder', category: 'Image, Media & Graphics', tech: 'DOM / CSS Live Engine', description: 'Visual CSS style generator with copy-paste code' },
  { id: 7, slug: 'exif-data-remover-viewer', name: 'Exif Data Remover & Viewer', category: 'Image, Media & Graphics', tech: 'Binary Parser / Canvas', description: 'Inspect and wipe GPS/camera metadata from photos' },
  { id: 8, slug: 'color-palette-generator', name: 'Color Palette Generator from Image', category: 'Image, Media & Graphics', tech: 'Canvas Pixel Sampler', description: 'Extract dominant color palettes from uploaded images' },
  { id: 9, slug: 'image-watermark-adder', name: 'Image Watermark Adder', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Add custom text watermarks to images locally' },
  { id: 10, slug: 'image-resizer-crop-tool', name: 'Image Resizer & Crop Tool', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Interactive image cropping and aspect ratio resizing' },
  { id: 11, slug: 'animated-gif-to-mp4-converter', name: 'Animated GIF / Frame Sequence Exporter', category: 'Image, Media & Graphics', tech: 'MediaRecorder / Canvas', description: 'Convert image animations into downloadable video clips' },
  { id: 12, slug: 'screen-recorder-canvas-grabber', name: 'Screen Recorder & Canvas Grabber', category: 'Image, Media & Graphics', tech: 'MediaRecorder API', description: 'Record screen, tab, or webcam directly in browser' },
  { id: 13, slug: 'ascii-art-generator', name: 'ASCII Art Generator', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Convert image pixels to styled ASCII text' },
  { id: 14, slug: 'css-mesh-gradient-generator', name: 'CSS Mesh Gradient Generator', category: 'Image, Media & Graphics', tech: 'CSS / Canvas Engine', description: 'Interactive colorful mesh gradient generator' },
  { id: 15, slug: 'sprite-sheet-splitter-generator', name: 'Sprite Sheet Splitter & Generator', category: 'Image, Media & Graphics', tech: 'Canvas API / JSZip', description: 'Combine multiple images into a single sprite sheet' },
  { id: 16, slug: 'meme-generator-text-overlay', name: 'Meme Generator & Text Overlay', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Add top and bottom custom text to uploaded images' },
  { id: 17, slug: 'blur-censor-image-regions', name: 'Blur / Censor Sensitive Image Regions', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Pixelate or redact confidential parts of screenshots' },
  { id: 18, slug: 'webp-to-png-jpg-converter', name: 'WEBP to PNG/JPG Converter', category: 'Image, Media & Graphics', tech: 'Canvas API', description: 'Export WEBP images into widely supported formats' },
  { id: 19, slug: 'base64-image-converter', name: 'Base64 to Image & Image to Base64', category: 'Image, Media & Graphics', tech: 'FileReader API', description: 'Encode/decode inline base64 image strings' },
  { id: 20, slug: 'svg-to-png-pdf-exporter', name: 'SVG to PNG/PDF Exporter', category: 'Image, Media & Graphics', tech: 'Canvas / pdf-lib', description: 'Rasterize vector SVG images into PNG or PDF' },

  // 21–35: PDF & Document Processing
  { id: 21, slug: 'pdf-merger', name: 'PDF Merger', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Combine multiple PDF documents into one file' },
  { id: 22, slug: 'pdf-splitter-page-extractor', name: 'PDF Splitter & Page Extractor', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Split pages or extract ranges into separate PDFs' },
  { id: 23, slug: 'pdf-page-reorder-rotator', name: 'PDF Page Reorder & Rotator', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Reorganize page order and rotate oriented pages' },
  { id: 24, slug: 'pdf-watermark-stamp-adder', name: 'PDF Watermark / Stamp Adder', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Apply text or visual stamps across PDF pages' },
  { id: 25, slug: 'pdf-page-numberer', name: 'PDF Page Numberer', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Add header/footer page numbers with formatting' },
  { id: 26, slug: 'pdf-to-images', name: 'PDF to Images (JPG/PNG)', category: 'PDF & Document Processing', tech: 'Canvas / PDF Renderer', description: 'Render PDF pages into downloadable image files' },
  { id: 27, slug: 'images-to-pdf-creator', name: 'Images to PDF Creator', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Convert JPG/PNG photo sets into single PDF' },
  { id: 28, slug: 'pdf-password-protector', name: 'PDF Permission & Metadata Locker', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Apply document restriction metadata and export locked PDFs' },
  { id: 29, slug: 'pdf-metadata-editor', name: 'PDF Metadata Editor', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Update title, author, subject, and keywords' },
  { id: 30, slug: 'markdown-to-pdf-exporter', name: 'Markdown to PDF / HTML Exporter', category: 'PDF & Document Processing', tech: 'marked + Print Engine', description: 'Render formatted markdown directly to print PDF or HTML' },
  { id: 31, slug: 'txt-csv-to-pdf-generator', name: 'TXT / CSV to PDF Generator', category: 'PDF & Document Processing', tech: 'pdf-lib / PapaParse', description: 'Format raw tabular or plain text into PDF' },
  { id: 32, slug: 'pdf-redactor', name: 'PDF Redactor (Blackout Text)', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Place permanent blackout redaction boxes on PDF pages' },
  { id: 33, slug: 'extract-text-from-pdf', name: 'Extract Text from PDF', category: 'PDF & Document Processing', tech: 'Binary Stream Parser', description: 'Parse text strings from uncompressed PDF content streams' },
  { id: 34, slug: 'invoices-receipt-generator', name: 'Invoices / Receipt Generator', category: 'PDF & Document Processing', tech: 'pdf-lib', description: 'Fill dynamic templates and download PDF invoices' },
  { id: 35, slug: 'certificates-generator-bulk', name: 'Certificates Generator in Bulk', category: 'PDF & Document Processing', tech: 'pdf-lib + PapaParse + JSZip', description: 'Merge CSV dataset with template to generate certificates' },

  // 36–60: Developer, API & Code
  { id: 36, slug: 'json-formatter-validator', name: 'JSON Formatter, Validator & Minifier', category: 'Developer, API & Code', tech: 'Vanilla JS', description: 'Prettify, validate syntax, and compress JSON payloads' },
  { id: 37, slug: 'jwt-decoder', name: 'JWT (JSON Web Token) Decoder', category: 'Developer, API & Code', tech: 'Base64URL / JSON', description: 'Decode token header, payload, and signature expiry' },
  { id: 38, slug: 'regex-tester', name: 'Regex Tester & Syntax Highlighter', category: 'Developer, API & Code', tech: 'RegExp API', description: 'Test pattern matching with real-time flag toggles' },
  { id: 39, slug: 'base64-encoder-decoder', name: 'Base64 Encoder / Decoder', category: 'Developer, API & Code', tech: 'TextEncoder / Base64', description: 'Encode or decode strings/binary to Base64 format' },
  { id: 40, slug: 'url-encoder-decoder', name: 'URL Encoder / Decoder', category: 'Developer, API & Code', tech: 'encodeURIComponent', description: 'Escape or unescape URL queries and path strings' },
  { id: 41, slug: 'html-css-js-beautifier', name: 'HTML/CSS/JS Beautifier & Minifier', category: 'Developer, API & Code', tech: 'Tokenizer / Formatter', description: 'Format or compress code for web optimization' },
  { id: 42, slug: 'sql-query-formatter', name: 'SQL Query Formatter', category: 'Developer, API & Code', tech: 'SQL Lexer', description: 'Format raw unformatted SQL into readable queries' },
  { id: 43, slug: 'curl-converter', name: 'cURL to Fetch / Axios / Python Converter', category: 'Developer, API & Code', tech: 'CLI Parser', description: 'Translate cURL syntax into programming languages' },
  { id: 44, slug: 'uuid-ulid-generator', name: 'UUID / ULID Generator', category: 'Developer, API & Code', tech: 'Crypto API', description: 'Generate random v4 UUIDs or sortable ULIDs in bulk' },
  { id: 45, slug: 'json-csv-converter', name: 'JSON to CSV / CSV to JSON Converter', category: 'Developer, API & Code', tech: 'PapaParse', description: 'Bi-directional conversion between JSON and CSV' },
  { id: 46, slug: 'json-to-typescript', name: 'JSON to TypeScript Interface Generator', category: 'Developer, API & Code', tech: 'AST Type Inferrer', description: 'Generate TS interfaces directly from sample JSON' },
  { id: 47, slug: 'crontab-generator', name: 'Crontab Expression Generator & Humanizer', category: 'Developer, API & Code', tech: 'cronstrue', description: 'Build cron schedules and view human readable text' },
  { id: 48, slug: 'htaccess-nginx-builder', name: 'HTACCESS / NGINX Rule Builder', category: 'Developer, API & Code', tech: 'Vanilla JS', description: 'Generate server redirect rules and security headers' },
  { id: 49, slug: 'graphql-prettifier', name: 'GraphQL Query Prettifier', category: 'Developer, API & Code', tech: 'GraphQL Tokenizer', description: 'Clean up and format GraphQL schema/queries' },
  { id: 50, slug: 'css-flexbox-grid-playground', name: 'CSS Flexbox & Grid Visual Playground', category: 'Developer, API & Code', tech: 'DOM / CSS', description: 'Interactive layout designer with CSS code export' },
  { id: 51, slug: 'js-keycode-finder', name: 'JavaScript Event Keycode Finder', category: 'Developer, API & Code', tech: 'KeyboardEvent API', description: 'Detect event.key, code, and keycodes on keypress' },
  { id: 52, slug: 'diff-checker', name: 'Diff Checker (Code & Text Comparison)', category: 'Developer, API & Code', tech: 'diff', description: 'Compare two text files line-by-line with visual diffs' },
  { id: 53, slug: 'git-command-generator', name: 'Git Command Generator', category: 'Developer, API & Code', tech: 'Interactive Form UI', description: 'Build complex git commands for cherry-pick, rebase, etc.' },
  { id: 54, slug: 'chmod-calculator', name: 'Chmod Permissions Calculator', category: 'Developer, API & Code', tech: 'Bitwise operators', description: 'Calculate Linux file permissions octal values' },
  { id: 55, slug: 'ip-subnet-cidr-calculator', name: 'IP Subnet & CIDR Calculator', category: 'Developer, API & Code', tech: 'Bitwise JS', description: 'Calculate subnet mask, broadcast IP, and host range' },
  { id: 56, slug: 'css-box-shadow-visualizer', name: 'CSS Box-Shadow & Border-Radius Visualizer', category: 'Developer, API & Code', tech: 'CSS Live Engine', description: 'Visually design shadows and custom borders' },
  { id: 57, slug: 'xml-to-json-converter', name: 'XML to JSON Converter', category: 'Developer, API & Code', tech: 'DOMParser API', description: 'Parse XML structure into equivalent JSON object' },
  { id: 58, slug: 'yaml-json-converter', name: 'YAML to JSON / JSON to YAML', category: 'Developer, API & Code', tech: 'js-yaml', description: 'Convert configuration files between YAML and JSON' },
  { id: 59, slug: 'js-obfuscator-deobfuscator', name: 'JavaScript Obfuscator & Deobfuscator', category: 'Developer, API & Code', tech: 'JS Encoder / Formatter', description: 'Encode or unpack JavaScript code structure' },
  { id: 60, slug: 'markdown-live-editor', name: 'Markdown Editor with Live Preview', category: 'Developer, API & Code', tech: 'marked', description: 'Distraction-free Markdown editor with instant output' },

  // 61–70: Cryptography & Security
  { id: 61, slug: 'password-generator', name: 'Client-Side Password Generator', category: 'Cryptography & Security', tech: 'Crypto.getRandomValues', description: 'Cryptographically secure password builder' },
  { id: 62, slug: 'sha-hash-generator', name: 'SHA-256 / SHA-512 Hash Generator', category: 'Cryptography & Security', tech: 'SubtleCrypto API', description: 'Compute cryptographic hashes for strings or files' },
  { id: 63, slug: 'md5-sha1-generator', name: 'MD5 / SHA1 Generator', category: 'Cryptography & Security', tech: 'Web Crypto / Native MD5', description: 'Calculate legacy hash digests locally' },
  { id: 64, slug: 'bcrypt-generator-verifier', name: 'Bcrypt Hash Generator & Verifier', category: 'Cryptography & Security', tech: 'bcryptjs', description: 'Generate salted bcrypt password hashes' },
  { id: 65, slug: 'aes-encryptor-decryptor', name: 'AES Text Encryptor & Decryptor', category: 'Cryptography & Security', tech: 'SubtleCrypto API', description: 'Encrypt text with AES-GCM using custom key' },
  { id: 66, slug: 'rsa-keypair-generator', name: 'RSA Key Pair Generator', category: 'Cryptography & Security', tech: 'SubtleCrypto API', description: 'Generate public/private RSA keypairs in browser' },
  { id: 67, slug: 'hmac-signature-generator', name: 'HMAC Signature Generator', category: 'Cryptography & Security', tech: 'SubtleCrypto API', description: 'Create keyed-hash message authentication codes' },
  { id: 68, slug: 'diceware-passphrase-generator', name: 'Passphrase Generator (Diceware)', category: 'Cryptography & Security', tech: 'Web Crypto API', description: 'Generate easy-to-remember word passphrases' },
  { id: 69, slug: 'password-strength-meter', name: 'Password Strength Meter & Audit', category: 'Cryptography & Security', tech: 'Entropy Engine', description: 'Estimate password crack time and strength rating' },
  { id: 70, slug: 'htpasswd-generator', name: 'HTPASSWD Password Generator', category: 'Cryptography & Security', tech: 'bcryptjs / SHA-1', description: 'Generate Apache htpasswd user authentication lines' },

  // 71–85: Financial & Calculators
  { id: 71, slug: 'compound-interest-calculator', name: 'Compound Interest & Wealth Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Project investment returns over time with breakdown' },
  { id: 72, slug: 'mortgage-loan-calculator', name: 'Mortgage & Loan Amortization Schedule', category: 'Financial & Calculators', tech: 'Financial formulas', description: 'Calculate monthly payment breakdown and interest' },
  { id: 73, slug: 'saas-runway-calculator', name: 'SaaS Runway & Burn Rate Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Estimate runway months based on cash and spend' },
  { id: 74, slug: 'freelance-hourly-rate-calculator', name: 'Freelance Hourly Rate Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Calculate required billable rate based on expenses' },
  { id: 75, slug: 'crypto-dca-calculator', name: 'Crypto Profit & Loss / DCA Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Calculate dollar-cost averaging and returns' },
  { id: 76, slug: 'paypal-stripe-fee-calculator', name: 'PayPal & Stripe Fee Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Calculate processing fees and exact charge total' },
  { id: 77, slug: 'roi-calculator', name: 'ROI (Return on Investment) Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Calculate percentage profit and annualized return' },
  { id: 78, slug: 'salary-tax-calculator', name: 'Salary Tax Breakdown Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Estimate take-home pay after effective tax deductions' },
  { id: 79, slug: 'break-even-calculator', name: 'Break-Even Point Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Determine unit sales volume needed to cover costs' },
  { id: 80, slug: 'affiliate-earnings-calculator', name: 'Affiliate Earnings & Conversion Rate', category: 'Financial & Calculators', tech: 'Math JS', description: 'Model traffic required to reach revenue targets' },
  { id: 81, slug: 'vat-sales-tax-calculator', name: 'VAT / Sales Tax Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Add or remove tax percentage from gross/net price' },
  { id: 82, slug: 'dividend-yield-calculator', name: 'Stock Dividend Yield Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Calculate passive income from stock holdings' },
  { id: 83, slug: 'inflation-impact-calculator', name: 'Inflation Impact Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Calculate purchasing power loss over decades' },
  { id: 84, slug: 'subscription-cost-tracker', name: 'Subscription Cost Tracker', category: 'Financial & Calculators', tech: 'LocalStorage', description: 'Manage recurring personal/business software spend' },
  { id: 85, slug: 'ltv-cac-calculator', name: 'Unit Economics & LTV/CAC Calculator', category: 'Financial & Calculators', tech: 'Math JS', description: 'Measure lifetime customer value against acquisition cost' },

  // 86–100: Text, Writing & SEO
  { id: 86, slug: 'word-character-counter', name: 'Word, Character & Sentence Counter', category: 'Text, Writing & SEO', tech: 'String manipulation', description: 'Count word length, reading time, and density' },
  { id: 87, slug: 'case-converter', name: 'Case Converter (Uppercase, camelCase)', category: 'Text, Writing & SEO', tech: 'String functions', description: 'Transform text styles instantly' },
  { id: 88, slug: 'lorem-ipsum-generator', name: 'Placeholder / Dummy Text Generator', category: 'Text, Writing & SEO', tech: 'Custom dictionary', description: 'Generate placeholder paragraphs or sentences' },
  { id: 89, slug: 'meta-tag-opengraph-previewer', name: 'Meta Tag & OpenGraph Live Previewer', category: 'Text, Writing & SEO', tech: 'DOM / CSS', description: 'Preview social card appearance for Google, X & LinkedIn' },
  { id: 90, slug: 'slug-permalink-generator', name: 'Slug / Permalink Generator', category: 'Text, Writing & SEO', tech: 'Regex String replace', description: 'Clean strings into URL-friendly permalinks' },
  { id: 91, slug: 'duplicate-line-remover', name: 'Duplicate Line Remover & Text Sorter', category: 'Text, Writing & SEO', tech: 'Array manipulation', description: 'Clean list data, sort alphabetically or numerical' },
  { id: 92, slug: 'text-to-speech-reader', name: 'Text to Speech (TTS) Reader', category: 'Text, Writing & SEO', tech: 'Web Speech API', description: 'Read aloud text using built-in browser speech synthesis' },
  { id: 93, slug: 'speech-to-text-dictation', name: 'Speech to Text Dictation Tool', category: 'Text, Writing & SEO', tech: 'Web Speech API', description: 'Convert spoken microphone audio into plain text' },
  { id: 94, slug: 'email-extractor', name: 'Email Address Extractor from Text', category: 'Text, Writing & SEO', tech: 'Regex matcher', description: 'Extract unique emails from unstructured raw text' },
  { id: 95, slug: 'url-domain-extractor', name: 'URL / Domain Extractor from Text', category: 'Text, Writing & SEO', tech: 'Regex matcher', description: 'Filter and export web links from bulk text' },
  { id: 96, slug: 'robots-txt-generator', name: 'Robots.txt File Generator', category: 'Text, Writing & SEO', tech: 'Form Builder', description: 'Generate rules and crawler access directives' },
  { id: 97, slug: 'xml-sitemap-builder', name: 'XML Sitemap Builder from Links List', category: 'Text, Writing & SEO', tech: 'String builder', description: 'Convert URL lists into search engine sitemap.xml' },
  { id: 98, slug: 'qr-code-generator', name: 'QR Code Generator & Customizer', category: 'Text, Writing & SEO', tech: 'qrcode', description: 'Build custom styled QR codes with instant PNG/SVG download' },
  { id: 99, slug: 'qr-code-reader', name: 'QR Code Reader / Scanner', category: 'Text, Writing & SEO', tech: 'BarcodeDetector / Image Upload', description: 'Scan QR codes from uploaded images or live camera' },
  { id: 100, slug: 'barcode-generator', name: 'Barcode Generator', category: 'Text, Writing & SEO', tech: 'JsBarcode', description: 'Create standard barcodes (CODE128, EAN13, UPC)' },
];