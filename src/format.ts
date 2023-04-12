// Extracted from recast
export interface CodeFormatOptions {
  tabWidth?: number;
  useTabs?: boolean;
  wrapColumn?: number;
  quote?: "single" | "double";
  trailingComma?: boolean;
  arrayBracketSpacing?: boolean;
  objectCurlySpacing?: boolean;
  arrowParensAlways?: boolean;
  useSemi?: boolean;
}

export function detectCodeFormat(
  code: string,
  userStyles: CodeFormatOptions = {}
): CodeFormatOptions {
  // Detect features only user not specified
  const detect = {
    wrapColumn: userStyles.wrapColumn === undefined,
    indent:
      userStyles.tabWidth === undefined || userStyles.useTabs === undefined,
    quote: userStyles.quote === undefined,
    // 箭头函数 paren
    arrowParens: userStyles.arrowParensAlways === undefined,
    // 尾逗号
    trailingComma: userStyles.trailingComma === undefined,
  };

  // Frequency counters and state
  let codeIndent = 2;
  let tabUsages = 0;
  let semiUsages = 0;
  let maxLineLength = 0;
  let multiLineTrailingCommaUsages = 0;

  // Syntax detection regex
  // TODO: Perf: Compile only for features we need to detect
  /**
   * 检测语法规则 
   * 
   * "" 中间不能存在 "
   *  '' 中间不存在 '
   * () => 括号中间不存在 ),
   * , + 任意空白字符 + ]} 
   * 
  */  
  const syntaxDetectRegex =
    /(?<doubleQuote>"[^"]+")|(?<singleQuote>'[^']+')|(?<singleParam>\([^),]+\)\s*=>)|(?<trailingComma>,\s*[\]}])/g;
  const syntaxUsages = {
    doubleQuote: 0,
    singleQuote: 0,
    singleParam: 0,
    trailingComma: 0,
  };

  // Line by line analysis
  const lines = (code || "").split("\n");
  let previousLineTrailing = false;
  for (const line of lines) {
    // Trim line
    // TODO: Trim comments
    const trimmitedLine = line.trim();

    // 跳过空行
    if (trimmitedLine.length === 0) {
      continue;
    }

    // Max width
    if (detect.wrapColumn && line.length > maxLineLength) {
      maxLineLength = line.length;
    }

    // Ident 分析
    if (detect.indent) {
      const lineIndent = line.match(/^\s+/)?.[0] || "";
      if (lineIndent.length > 0) {
        if (lineIndent.length > 0 && lineIndent.length < codeIndent) {
          codeIndent = lineIndent.length;
        }
        if (lineIndent[0] === "\t") {
          tabUsages++;
        } else if (lineIndent.length > 0) {
          // lineident.length > 2
          tabUsages--;
        }
      }
    }

    // 行尾分析
    if (trimmitedLine[trimmitedLine.length - 1] === ";") {
      semiUsages++;
    } else if (trimmitedLine.length > 0) {
      semiUsages--;
    }

    // 语法分析
    if (detect.quote || detect.arrowParens) {
      const matches = trimmitedLine.matchAll(syntaxDetectRegex);
      for (const match of matches) {
        if (!match.groups) {
          continue;
        }
        // syntaxUsages 记录
        for (const key in syntaxUsages) {
          if (match.groups[key]) {
            // @ts-ignore
            syntaxUsages[key]++;
          }
        }
      }
    }

    // 尾逗号
    if (detect.trailingComma) {
      if (line.startsWith("}") || line.startsWith("]")) {
        if (previousLineTrailing) {
          multiLineTrailingCommaUsages++;
        } else {
          multiLineTrailingCommaUsages--;
        }
      }
  
      previousLineTrailing = trimmitedLine.endsWith(",");
    }
  }

  return <CodeFormatOptions>{
    wrapColumn: maxLineLength,
    useTabs: tabUsages > 0,
    tabWidth: codeIndent,
    quote:
      syntaxUsages.singleQuote > syntaxUsages.doubleQuote ? "single" : "double",
    arrowParensAlways: syntaxUsages.singleParam > 0,
    trailingComma:
      multiLineTrailingCommaUsages > 0 || syntaxUsages.trailingComma > 0,
    useSemi: semiUsages > 0,
    arrayBracketSpacing: undefined, // TODO
    objectCurlySpacing: undefined, // TODO
    ...userStyles,
  };
}
