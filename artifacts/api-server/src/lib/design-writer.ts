import { writeFile } from "fs/promises";
import { join } from "path";

/**
 * Sanitise a raw AI-generated script so it is compatible with
 * cadquery-server (cq-server).
 *
 * Rules enforced:
 *  - Strip markdown fences
 *  - Strip jupyter_cadquery imports
 *  - Strip file-export / save calls
 *  - Strip any stray show() calls (we add our own at the end)
 *  - Ensure  from cq_server.ui import ui, show_object  is at the top
 *  - Ensure the script ends with  result = <var>  then  show_object(result)
 */
export function sanitiseScript(raw: string): string {
  // 1. Strip markdown fences
  const fenceMatch = raw.match(/```(?:python)?\n?([\s\S]*?)\n?```/);
  let code = fenceMatch ? fenceMatch[1] : raw;

  // 2. Strip jupyter_cadquery imports
  code = code.replace(/^.*jupyter_cadquery.*$/gm, "");

  // 3. Strip any show() / show_object() calls the AI added (we'll add our own)
  code = code.replace(/^\s*show(?:_object)?\s*\(.*\)\s*$/gm, "");

  // 4. Strip file-export / save calls
  code = code.replace(
    /^[^\n]*\.(exportStep|exportStl|exportBrep|export|save)\s*\(.*$/gm,
    ""
  );

  // 4b. Remove deprecated / non-existent CadQuery methods
  code = code.replace(/\.workplaneFromObject\s*\([^)]*\)/g, "");
  code = code.replace(/\.copyWorkplane\s*\([^)]*\)/g, "");
  code = code.replace(/\.filterByZ\s*\([^)]*\)/g, "");
  code = code.replace(/\.filterByX\s*\([^)]*\)/g, "");
  code = code.replace(/\.filterByY\s*\([^)]*\)/g, "");
  code = code.replace(/\.shell\s*\([^)]*\)/g, "");
  code = code.replace(/\.extrude\s*\([^)]*\)/g, "");
  code = code.replace(/\.revolve\s*\([^)]*\)/g, "");
  code = code.replace(/\.sweep\s*\([^)]*\)/g, "");

  // 4b-2. Strip invalid CadQuery attribute reads: obj.X, obj.Y, obj.Z
  //        CadQuery Workplane objects have NO .X/.Y/.Z properties.
  //        The LLM sometimes does: height = obj.Z + 300  — this crashes.
  //        Strategy: replace every line that reads a bare .X/.Y/.Z rvalue with
  //        a comment so the script stays syntactically valid and the user can
  //        refine again with a corrected instruction.
  code = code.replace(
    /^([^\n#]*)(\b\w+\.(X|Y|Z)\b)(.*?)$/gm,
    (_match, pre, ref, _axis, post) => {
      // If it's inside a string literal, leave it alone
      if ((pre + ref + post).match(/(['"]).*\b[XYZ]\b.*\1/)) return _match;
      return `# SANITISED (no ${ref} attr in CadQuery): ${pre}${ref}${post}`;
    }
  );

  // 4c-pre. Fix ALL LLM mis-spellings of cq.Workplane(:
  //   - Truncated: Workplan( (missing 'e') → [Ee]? makes 'e' optional
  //   - Suffixed:  WorkplaneIn(, WorkplaneAt(, Workplanen( → \w* catches any suffix
  //   - Lowercase: cq.workplane( → [Ww] handles case
  //   - Correct form cq.Workplane( passes through idempotently (\w* = 0 extra chars)
  code = code.replace(/\bcq\.[Ww]orkplan[Ee]?\w*\s*\(/g, "cq.Workplane(");

  // 4c. Normalise slope-angle radian variable names.
  //     The AI often defines roof_slope_angle_rad, slope_angle_rad, pitch_rad etc.
  //     Find the first definition and normalise ALL variants to that one name.
  const slopeRadDef = code.match(/\b([A-Za-z_]\w*slope\w*rad\w*|[A-Za-z_]\w*pitch\w*rad\w*|[A-Za-z_]\w*angle\w*rad\w*)\s*=/);
  if (slopeRadDef) {
    const canonicalName = slopeRadDef[1];
    const variants = [
      "slope_angle_rad", "roof_slope_angle_rad", "slope_rad",
      "pitch_rad", "roof_pitch_rad", "angle_rad", "roof_angle_rad",
      "tilt_rad", "roof_tilt_rad",
    ];
    for (const v of variants) {
      if (v !== canonicalName) {
        code = code.replace(new RegExp(`\\b${v}\\b`, "g"), canonicalName);
      }
    }
  }

  // 5. Strip any existing cq_server import (we'll prepend a clean one)
  code = code.replace(/^.*cq_server.*$/gm, "");

  // 6. Collapse multiple blank lines left by the stripping above
  code = code.replace(/\n{3,}/g, "\n\n").trim();

  // 7. Ensure result = <last variable> exists
  if (!/^\s*result\s*=/m.test(code)) {
    const assignRe = /^([A-Za-z_]\w*)\s*=/gm;
    let lastVar: string | null = null;
    let m: RegExpExecArray | null;
    while ((m = assignRe.exec(code)) !== null) {
      lastVar = m[1];
    }
    if (lastVar && lastVar !== "result") {
      code = code + `\n\nresult = ${lastVar}`;
    }
  }

  // 8. Append show_object(result) as the final line
  code = code + `\n\nshow_object(result)\n`;

  // 9. Prepend the required cq_server import after any existing cadquery import
  const cqServerImport = "from cq_server.ui import ui, show_object";
  if (!code.includes(cqServerImport)) {
    // Insert right after the last top-level import line
    code = code.replace(
      /^(import cadquery.*)/m,
      `$1\n${cqServerImport}`
    );
    // If no cadquery import found, prepend at top
    if (!code.includes(cqServerImport)) {
      code = `import cadquery as cq\n${cqServerImport}\n\n${code}`;
    }
  }

  return code;
}

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
  rawModelOutput: string,
  options: { skipSanitise?: boolean } = {}
): Promise<void> {
  const code = options.skipSanitise ? rawModelOutput : sanitiseScript(rawModelOutput);

  // Write the sanitised Python script (cq-server compatible)
  const pyPath = join(sharedDesignsPath, "latest_design.py");
  await writeFile(pyPath, code, "utf8");
  console.log("Wrote latest_design.py to", sharedDesignsPath);

  // Write the companion JupyterLab viewer notebook
  const notebookJson = buildNotebook("/home/cq/work/latest_design.py");
  const nbPath = join(sharedDesignsPath, "view_latest.ipynb");
  await writeFile(nbPath, notebookJson, "utf8");
  console.log("Wrote view_latest.ipynb to", sharedDesignsPath);
}
