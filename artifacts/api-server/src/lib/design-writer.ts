import { writeFile } from "fs/promises";
import { join } from "path";

function buildNotebook(designPath: string): string {
  const cell1 = [
    "import re, cadquery as cq\n",
    "from jupyter_cadquery.cadquery import show\n",
    "\n",
    "# Load and sanitise the generated design script\n",
    `with open('${designPath}', 'r') as _f:\n`,
    "    _code = _f.read()\n",
    "\n",
    "# Strip any file-export calls the AI may have added\n",
    "_bad = re.compile(\n",
    "    r'^[^\\n]*\\.(?:exportStep|exportStl|export|save)\\s*\\(.*$',\n",
    "    re.MULTILINE | re.IGNORECASE\n",
    ")\n",
    "_code = _bad.sub('', _code)\n",
    "\n",
    "# Execute in this notebook's global namespace\n",
    "exec(_code, globals())\n",
    "print('Script loaded OK')",
  ];

  const cell2 = [
    "# Auto-find the CadQuery result and display it\n",
    "_result = globals().get('result')\n",
    "if _result is None:\n",
    "    _cq_vars = [\n",
    "        (k, v) for k, v in globals().items()\n",
    "        if isinstance(v, (cq.Workplane, cq.Assembly))\n",
    "        and not k.startswith('_')\n",
    "    ]\n",
    "    if _cq_vars:\n",
    "        _result = _cq_vars[-1][1]\n",
    "        print(f'Showing variable: {_cq_vars[-1][0]}')\n",
    "\n",
    "if _result is not None:\n",
    "    show(_result)\n",
    "else:\n",
    "    print('No CadQuery object found — check latest_design.py')",
  ];

  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: { name: "python" },
    },
    cells: [
      {
        cell_type: "code",
        execution_count: null,
        id: "cell-load",
        metadata: {},
        outputs: [],
        source: cell1,
      },
      {
        cell_type: "code",
        execution_count: null,
        id: "cell-show",
        metadata: {},
        outputs: [],
        source: cell2,
      },
    ],
  };

  return JSON.stringify(notebook, null, 2);
}

export async function writeDesignFiles(
  sharedDesignsPath: string,
  rawModelOutput: string
): Promise<void> {
  let code = rawModelOutput;

  // Strip markdown fences if the AI wrapped the script
  const codeMatch = rawModelOutput.match(/```(?:python)?\n?([\s\S]*?)\n?```/);
  if (codeMatch) code = codeMatch[1];

  // Write the raw Python script
  const pyPath = join(sharedDesignsPath, "latest_design.py");
  await writeFile(pyPath, code, "utf8");
  console.log("Wrote latest_design.py to", sharedDesignsPath);

  // Write the companion viewer notebook
  const notebookJson = buildNotebook("/home/cq/work/latest_design.py");
  const nbPath = join(sharedDesignsPath, "view_latest.ipynb");
  await writeFile(nbPath, notebookJson, "utf8");
  console.log("Wrote view_latest.ipynb to", sharedDesignsPath);
}
