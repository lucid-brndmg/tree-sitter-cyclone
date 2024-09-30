; Basic syntax highlight rules for Cyclone
[
  "->" "<->" "=>" "||" "&&" "^" "|" "&" "==" "!=" "<" ">" "<=" ">=" "<<" ">>" "+" "-" "*" "/" "%" "**" "=" "+=" "-=" "*=" "/=" "<<=" ">>=" "!" "~" "++" "--"
  ] @operator

[
  "option-" "graph" "machine" "debug" "log" "output" "trace" "precision" "timeout" "detect" "bvdisplay" "state" "node" "edge" "trans" "transition" "on" "label" "record" "invariant" "in" "goal" "assert" "let" "check" "enumerate" "for" "each" "upto" "via" "condition" "with" "reach" "stop" "function" "return" "where" "const" "initial" "fresh" "one" "in"
  ] @keyword

["start" "final" "abstract" "normal" "some" "always"] @attribute

["int" "real" "bool" "bv" "enum"] @type

(function_decl
  function_identifier: (identifier) @function)

(expr_call (identifier) @function)

(function_parameter (identifier) @variable.parameter)

["true" "false"] @constant.builtin

[(line_comment) (block_comment)] @comment

(identifier ) @variable

[(literal_int) (literal_bv) (literal_real)] @number

[(literal_string) (literal_char)] @string

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
  ] @punctuation.bracket

[";" ":" "." ","] @punctuation.delimiter

(escape_sequence) @escape