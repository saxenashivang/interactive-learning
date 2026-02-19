"""Interactive HTML Generator Agent.

Generates self-contained HTML files with React, Mermaid.js, Tailwind CSS,
and Leaflet.js bundled via CDN. Output is stored in S3 and served via iframe.
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {{
            darkMode: 'class',
            theme: {{
                extend: {{
                    colors: {{
                        primary: {{ 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' }},
                        surface: {{ 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 700: '#334155', 800: '#1e293b', 900: '#0f172a' }},
                    }}
                }}
            }}
        }}
    </script>

    <!-- React -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <!-- Mermaid.js -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>

    <!-- Leaflet.js -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>

    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            padding: 1.5rem;
        }}
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .glass {{
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 1rem;
        }}

        .gradient-text {{
            background: linear-gradient(135deg, #818cf8, #6366f1, #4f46e5);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .animate-fade-in {{
            animation: fadeIn 0.5s ease-out;
        }}

        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(10px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        .mermaid {{ background: transparent !important; }}
        .mermaid svg {{ max-width: 100% !important; }}
    </style>
</head>
<body class="dark">
    <div id="root"></div>
    <script type="text/babel">
        {react_code}
    </script>
    <script>
        // Initialize Mermaid
        mermaid.initialize({{
            startOnLoad: true,
            theme: 'dark',
            themeVariables: {{
                primaryColor: '#6366f1',
                primaryTextColor: '#e2e8f0',
                primaryBorderColor: '#4f46e5',
                lineColor: '#818cf8',
                secondaryColor: '#1e293b',
                tertiaryColor: '#0f172a',
                background: '#0f172a',
                mainBkg: '#1e293b',
                nodeBorder: '#4f46e5',
                clusterBkg: 'rgba(30, 41, 59, 0.5)',
                titleColor: '#e2e8f0',
            }}
        }});

        // Re-render mermaid after React mounts
        setTimeout(() => mermaid.run(), 500);
    </script>
</body>
</html>"""


def generate_interactive_html(title: str, react_code: str) -> str:
    """Generate a self-contained interactive HTML file.

    Args:
        title: Page title.
        react_code: React component code (JSX with Babel transform).

    Returns:
        Complete HTML string ready to be stored and served.
    """
    return HTML_TEMPLATE.format(title=title, react_code=react_code)
