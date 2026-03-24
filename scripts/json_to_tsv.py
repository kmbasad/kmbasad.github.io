import json
import csv
import os

def format_header(node, synth_node=None):
    parts = []
    # Primary fields
    if 'n' in node: parts.append(node['n'])
    elif 'name' in node: parts.append(node['name'])
    elif 'key' in node: parts.append(node['key'])
    elif 'h' in node: parts.append(node['h'])
    
    # Secondary fields
    if 'd' in node: parts.append(node['d'])
    if 'c' in node: parts.append(node['c'])
    if 'desc' in node: parts.append(node['desc'])
    
    # Synthesis fields
    if synth_node:
        if 'k' in synth_node: parts.append(synth_node['k'])
        if 's' in synth_node: parts.append(synth_node['s'])
        if 'h' in synth_node: parts.append(synth_node['h'])
        if 'b' in synth_node: parts.append(synth_node['b'])
        if 'l' in synth_node: parts.append(synth_node['l'])
        
    parts = [str(p).strip() for p in parts if p]
    return "\n\n".join(parts)

def convert_to_tsv(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cols = data.get('cols', [])
    rows = data.get('rows', [])
    col_synths = data.get('colSynths', [])
    row_synths = data.get('rowSynths', [])
    cells = data.get('cells', [])
    
    # Identify column headers
    col_headers = []
    for i, c in enumerate(cols):
        synth = col_synths[i] if i < len(col_synths) else None
        col_headers.append(format_header(c, synth))
    
    # Identify row headers
    row_headers = []
    for i, r in enumerate(rows):
        synth = row_synths[i] if i < len(row_synths) else None
        row_headers.append(format_header(r, synth))

    # Corner label
    corner = data.get('labelCell', 'Property / Concept')
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter='\t', quoting=csv.QUOTE_MINIMAL)
        
        # Write header row
        writer.writerow([corner] + col_headers)
        
        # Write data rows
        for i, row_label in enumerate(row_headers):
            row_data = [row_label]
            for j in range(len(col_headers)):
                try:
                    cell = cells[i][j]
                    # Flatten content
                    content = ""
                    if 's' in cell and 'l' in cell:
                        content = f"{cell['s']}\n\n{cell['l']}"
                    elif 'k' in cell and 'h' in cell and 'b' in cell:
                        content = f"{cell['k']}\n{cell['h']}\n\n{cell['b']}"
                    elif 'h' in cell and 'b' in cell:
                         content = f"{cell['h']}\n\n{cell['b']}"
                    else:
                        # Fallback for any other structure
                        content = str(cell)
                    
                    row_data.append(content)
                except (IndexError, KeyError):
                    row_data.append("")
            writer.writerow(row_data)

    print(f"Converted {input_path} to {output_path}")

if __name__ == "__main__":
    files_to_convert = [
        ('/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/consciousness.json', '/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/consciousness.tsv'),
        ('/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/god-philosophers.json', '/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/god-philosophers.tsv'),
        ('/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/god-prophets.json', '/home/asad/Dropbox/GitHubs/kmbasad.github.io/creations/god-prophets.tsv'),
        ('/home/asad/Dropbox/GitHubs/kmbasad.github.io/visions/chan-wook.json', '/home/asad/Dropbox/GitHubs/kmbasad.github.io/visions/chan-wook.tsv'),
    ]

    for inp, outp in files_to_convert:
        if os.path.exists(inp):
            convert_to_tsv(inp, outp)
        else:
            print(f"Skipping {inp} (not found)")
