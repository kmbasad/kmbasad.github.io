import os
import re

def build_html():
    # Read the text file containing the ghazals
    with open('ghazals-1-33.txt', 'r', encoding='utf-8') as f:
        content = f.read().strip()

    # Split the content by Ghazal numbers (e.g., "১", "২", "3")
    # This regex looks for digits (Bengali or English) alone on a line
    parts = re.split(r'\n([০-৯0-9]+)\s*\n', '\n' + content)
    
    html_output = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ghazals 1-33 — Hafez</title>
<link rel="stylesheet" href="../css/style.css">
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <span class="nav-brand"><a href="../index.html">KMBA</a></span>
    <ul class="nav-links">
      <li><a href="../philosophy/index.html">Philosophy</a></li>
      <li><a href="index.html" class="active">Translations</a></li>
      <li><a href="../history/index.html">History</a></li>
    </ul>
  </div>
</nav>

<div class="page-header">
  <div class="page-header-inner">
    <div class="breadcrumb">
      <a href="index.html">Translations</a> <span>/</span> <a href="hafez.html">Hafez</a> <span>/</span> Ghazals 1-33
    </div>
  </div>
</div>

<div class="trans-page">
  <div class="trans-header">
    <h1>Ghazals 1 to 33</h1>
    <p>Continuous bilingual reading. Scroll horizontally on small screens.</p>
  </div>
"""

    # parts[0] is empty. parts[1] is num, parts[2] is text, etc.
    for i in range(1, len(parts), 2):
        ghazal_num = parts[i].strip()
        ghazal_text = parts[i+1].strip()
        
        lines = ghazal_text.split('\n')
        
        html_output += f"""
  <div class="trans-ghazal">
    <div class="trans-label">Ghazal {ghazal_num}</div>
    <div class="trans-wrap">
      <table class="trans-table">
        <thead>
          <tr>
            <th>Bangla</th>
            <th class="trans-fa-head">Persian</th>
          </tr>
        </thead>
        <tbody>
"""
        
        # Process every 2 lines as 1 verse (row)
        for j in range(0, len(lines), 2):
            line1 = lines[j].strip().split('\t')
            line2 = lines[j+1].strip().split('\t') if j+1 < len(lines) else ["", ""]
            
            bn_1 = line1[0] if len(line1) > 0 else ""
            fa_1 = line1[1] if len(line1) > 1 else ""
            
            bn_2 = line2[0] if len(line2) > 0 else ""
            fa_2 = line2[1] if len(line2) > 1 else ""
            
            # Grouping the verse with <br> inside a single table row
            html_output += f"""          <tr>
            <td class="trans-bn">{bn_1}<br>{bn_2}</td>
            <td class="trans-fa">{fa_1}<br>{fa_2}</td>
          </tr>
"""
        
        html_output += """        </tbody>
      </table>
    </div>
  </div>
"""

    html_output += """
</div>
</body>
</html>"""

    # Ensure the translations folder exists
    os.makedirs('translations', exist_ok=True)
    
    # Write the complete HTML file
    with open('translations/ghazals-1-33.html', 'w', encoding='utf-8') as f:
        f.write(html_output)
    
    print("Successfully generated translations/ghazals-1-33.html with all 33 ghazals!")

if __name__ == "__main__":
    build_html()