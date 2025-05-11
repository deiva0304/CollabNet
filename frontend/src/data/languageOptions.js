// languageOptions.js
export const languageOptions = [
  {
    id: "cpp",
    value: "cpp",
    label: "C++",
    defaultCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!";\n    return 0;\n}`
  },
  {
    id: "python",
    value: "python",
    label: "Python",
    defaultCode: `print("Hello, World!")`
  },
  {
    id: "java",
    value: "java",
    label: "Java",
    defaultCode: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`
  },
  {
    id: "javascript",
    value: "javascript",
    label: "JavaScript",
    defaultCode: `console.log("Hello, World!");`
  },
  {
    id: "c",
    value: "c",
    label: "C",
    defaultCode: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!");\n    return 0;\n}`
  },
  {
    id: "go",
    value: "go",
    label: "Go",
    defaultCode: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}`
  },
  {
    id: "rust",
    value: "rust",
    label: "Rust",
    defaultCode: `fn main() {\n    println!("Hello, World!");\n}`
  },
  {
    id: "ruby",
    value: "ruby",
    label: "Ruby",
    defaultCode: `puts "Hello, World!"`
  },
  {
    id: "swift",
    value: "swift",
    label: "Swift",
    defaultCode: `print("Hello, World!")`
  },
  {
    id: "php",
    value: "php",
    label: "PHP",
    defaultCode: `<?php\necho "Hello, World!";\n?>`
  },
  {
    id: "typescript",
    value: "typescript",
    label: "TypeScript",
    defaultCode: `console.log("Hello, World!");`
  },
  {
    id: "kotlin",
    value: "kotlin",
    label: "Kotlin",
    defaultCode: `fun main() {\n    println("Hello, World!")\n}`
  },
  {
    id: "scala",
    value: "scala",
    label: "Scala",
    defaultCode: `object Main extends App {\n    println("Hello, World!")\n}`
  },
  {
    id: "r",
    value: "r",
    label: "R",
    defaultCode: `print("Hello, World!")`
  },
  {
    id: "bash",
    value: "bash",
    label: "Bash",
    defaultCode: `echo "Hello, World!"`
  },
  {
    id: "latex",
    value: "latex",
    label: "LaTeX",
    defaultCode: `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\n\\title{Your Document}\n\\author{You}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n\\section{Introduction}\nStart writing here!\n\n\\end{document}`
  }
];