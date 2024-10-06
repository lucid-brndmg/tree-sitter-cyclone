const PREC = {
  COMMENT: 0,         // //  /*  */
  ASSIGN: 1,          // =  += -=  *=  /=  <<=  >>=
  RETURN: 2,
  IMPLIES: 3,         // =>
  OR: 4,              // ||
  AND: 5,             // &&
  XOR: 6,             // ^
  PATH_OCCUR: 7,
  BIT_OR: 7,          // |
  BIT_AND: 8,         // &
  EQUALITY: 9,        // ==  !=
  CMP: 10,            // <  <=  >  >=
  SHIFT: 11,          // <<  >>
  ADD: 12,            // +  -
  MULT: 13,           // *  /  %
  POW: 14,            //  **
  UNARY: 15,          // ++ -- + - ! ~
  PARENS: 16,         // (Expression)
};

module.exports = grammar({
  name: "cyclone",

  extras: $ => [
    $.line_comment,
    $.block_comment,
    /\s/,
  ],

  conflicts: $ => [
    [$.path_condition_inc, $.path_condition_inc],
    [$.path_condition_primary, $.path_condition_primary]
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(
      repeat($.compiler_option),
      $.graph_decl,
    ),

    line_comment: _ => token(prec(PREC.COMMENT, seq('//', /[^\n]*/))),

    block_comment: _ => token(prec(
      PREC.COMMENT,
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      )
    )),

    compiler_option: $ => seq(
      'option-',
      field("compiler_option_name", $.compiler_option_name),
      '=',
      field("compiler_option_value", $.compiler_option_literal),
      ";"
    ),

    compiler_option_name: $ => choice(
      "debug",
      "log",
      "output",
      "trace",
      "precision",
      "timeout",
      "detect",
      "bvdisplay"
    ),
    compiler_option_literal: $ => choice(
      $.literal_int,
      $.literal_string,
      $.literal_bool,
      $.literal_char
    ),

    graph_decl: $ => seq(
      field("graph_keyword", choice("graph", "machine")),
      field("graph_identifier", $.identifier),
      '{',
      repeat(field("graph_definition", choice($.variable_group, $.global_constant, $.record_decl, $.function_decl))),
      repeat(field("graph_node", $.node_decl)),
      repeat(field("graph_edge", $.edge_decl)),
      repeat(field("graph_invariant", $.invariant_decl)),
      optional(field("graph_goal", $.goal_decl)),
      '}'
    ),

    node_modifier: $ => choice(
      "start",
      "final",
      "abstract",
      "normal"
    ),

    node_decl: $ => seq(
      repeat(field("node_modifier", $.node_modifier)),
      field("node_keyword", choice("state", "node")),
      field("node_identifier", $.identifier),
      "{",
      repeat(field("node_statement", $.statement)),
      "}"
    ),

    edge_decl: $ => seq(
      field("edge_keyword", choice("edge", "trans", "transition")),
      optional(field("edge_identifier", $.identifier)),
      "{",
      field("edge_source", $.identifier),
      field("edge_direction", choice("->", "<->")),
      $.edge_target,
      optional(field("edge_label", $.edge_label)),
      optional(seq($._where_expr, ";")),
      "}"
    ),

    edge_label: $ => seq(choice("on", "label"), $.literal_string),

    edge_target: $ => choice(
      comma_sep1(field("edge_target_node", $.identifier)),
      seq(field("edge_target_closure_operator", $.edge_closure_operator), optional(seq("[", comma_sep1(field("edge_target_closure_exclusion", $.identifier)), "]")))
    ),

    edge_closure_operator: $ => choice("*", "+"),

    record_decl: $ => seq(
      "record",
      field("record_identifier", $.identifier),
      "{",
      repeat1(field("record_variable", $.record_variable)),
      "}",
      ";"
    ),

    record_variable: $ => seq(field("type_mark", $.type_mark), field("var_decl", $.variable_decl), ';'),

    invariant_decl: $ => seq(
      "invariant",
      field("invariant_identifier", $.identifier),
      "{", field("invariant_body", $.statement), "}",
      optional($._in_identifiers)
    ),

    _in_identifiers: $ => seq("in", "(", comma_sep1(field("in_identifier", $.identifier)), ")"),

    goal_decl: $ => seq(
      "goal",
      "{",
      repeat(choice($.path_decl, $.path_assign, $.assert_expr)),
      $.goal_final,
      "}"
    ),

    assert_expr: $ => seq(
      // todo: annotationExpr?
      optional($.annotation),
      "assert",
      optional(field("assert_qualifier", choice("some", "always"))),
      field("assert_body", $.expr),
      optional($._in_identifiers),
      ";"
    ),

    annotation: $ => seq(
      "@", "label", ":",
      $.identifier
    ),

    path_decl: $ => seq(
      "let",
      field("path_decl_identifier", $.identifier),
      optional($._assign_path_expr),
      ";"
    ),
    path_assign: $ => seq(
      field("path_assign_identifier", $.identifier),
      $._assign_path_expr,
      ";"
    ),
    _assign_path_expr: $ => seq("=", field("path_body", $.path_expr)),

    goal_final: $ => seq(
      field("goal_final_keyword", choice("check", "enumerate")),
      field("goal_final_mode", choice("for", "each", "upto")),
      comma_sep1(field("goal_final_length", $.literal_int)),
      optional(field("goal_final_via", $.goal_final_via)),
      optional(field("goal_final_with", $.goal_final_with)),
      optional(field("goal_final_reach", $.goal_final_reach))
    ),
    goal_final_via: $ => seq(
      field("goal_final_via_keyword", choice("via", "condition")),
      "(",
      comma_sep1(field("goal_final_via_path", $.path_expr)),
      ")",
    ),

    goal_final_with: $ => seq("with", "(", comma_sep1(field("goal_with_identifier", $.identifier)), ")"),

    goal_final_reach: $ => seq(
      field("goal_reach_keyword", choice("reach", "stop")),
      "(",
      comma_sep1(field("goal_reach_identifier", $.identifier)),
      ")"
    ),

    path_expr: $ => choice(
      $.path_expr_binary,
      $.path_expr_unary,
      $.path_expr_paren,
      $.path_expr_condition,
    ),

    path_expr_binary: $ => choice(
      ...[
        ['&&', PREC.AND],
        ['||', PREC.OR],
        ['^', PREC.XOR]
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq(
          $.path_expr,
          operator,
          $.path_expr,
        )),
      )),

    // currently, cyclone only has ! as unary path expr
    path_expr_unary: $ => prec.left(PREC.UNARY, seq(
      "!",
      $.path_expr,
    )),

    path_expr_paren: $ => seq("(", $.path_expr, ")"),

    path_expr_condition: $ => choice(
      $.path_condition_primary,
      $.path_condition_inc,
      $.literal_bool,
    ),

    path_condition_primary: $ => seq(
      optional($.path_shift),
      choice(seq("(", $.path_arrow, ")"), $.path_arrow),
      optional($.path_hat)
    ),

    path_condition_inc: $ => choice(
      seq(optional($.path_shift), $.identifier, optional($.path_hat)),
      seq(optional($.path_shift), "(", $.identifier, optional($.path_hat), ")"),
    ),

    // path_condition_inc: $ => prec.left(PREC.PATH_OCCUR, seq(
    //   optional($.path_shift),
    //   choice($.identifier, seq("(", $.identifier, ")")),
    //   optional($.path_hat)
    // )),

    path_arrow: $ => seq($.path_node, repeat1(seq("->", $.path_node))),
    path_node: $ => choice($.identifier, seq("_", optional(seq("[", comma_sep1($.identifier), "]")))),
    path_shift: $ => seq(choice("<<", ">>"), optional($.literal_int)),
    path_hat: $ => seq("^", "{", $.literal_int, optional(seq(":", $.literal_int)), "}"),

    function_decl: $ => seq(
      "function",
      field("function_identifier", $.identifier),
      ":", field("function_type", $.type_mark_function),
      "(", comma_sep1(field("function_parameter", $.function_parameter)), ")",
      "{",
      repeat(field("function_variable", $.variable_group)),
      repeat1(field("function_statement", $.statement)),
      "}"
    ),

    function_parameter: $ => seq($.identifier, ":", $.type_mark_function),

    variable_group: $ => seq(
      field("type_mark", $.type_mark),
      comma_sep1(field("var_decl", $.variable_decl)),
      ';'
    ),

    global_constant: $ => seq(
      'const',
      field("type_mark", $.type_mark),
      comma_sep1(field("const_decl", $.constant_decl)),
      ';'
    ),

    constant_decl: $ => seq($.identifier, '=', $.expr),

    variable_decl: $ => seq(
      field("var_decl_identifier", $.identifier),
      optional(seq("=", field("var_decl_init", $.expr))),
      optional($._where_expr)
    ),

    _where_expr: $ => seq('where', field("where_expr", $.expr)),

    type_mark: $ => choice(
      $._type_mark_primitive,
      $._type_mark_bv,
      $._type_mark_enum
    ),
    type_mark_function: $ => choice(
      $._type_mark_primitive,
      $._type_mark_bv,
    ),

    _type_mark_primitive: $ => choice("int", "real", "bool"),
    _type_mark_bv: $ => seq("bv", '[', $.literal_int, ']'),
    _type_mark_enum: $ => seq("enum", '{', comma_sep1($.identifier), '}'),

    statement: $ => seq($.expr, ";"),

    expr: $ => choice(
      $.expr_binary,
      $.expr_unary,
      $.expr_primary,
      $.expr_assign,
      $.expr_update
    ),

    expr_binary: $ => choice(
      ...[
        ['=>', PREC.IMPLIES],
        ['||', PREC.OR],
        ['&&', PREC.AND],
        ['^', PREC.XOR],
        ['|', PREC.BIT_OR],
        ['&', PREC.BIT_AND],
        ['==', PREC.EQUALITY],
        ['!=', PREC.EQUALITY],
        ['<', PREC.CMP],
        ['>', PREC.CMP],
        ['<=', PREC.CMP],
        ['>=', PREC.CMP],
        ["<<", PREC.SHIFT],
        [">>", PREC.SHIFT],
        ["+", PREC.ADD],
        ["-", PREC.ADD],
        ["*", PREC.MULT],
        ["/", PREC.MULT],
        ["%", PREC.MULT],
        ["**", PREC.POW]
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq(
          $.expr,
          operator,
          $.expr,
        )),
      )),
    expr_unary: $ => choice(...[
      ['+', PREC.UNARY],
      ['-', PREC.UNARY],
      ['!', PREC.UNARY],
      ['~', PREC.UNARY],
    ].map(([operator, precedence]) =>
      prec.left(precedence, seq(
        operator,
        $.expr,
      )),
    )),
    expr_update: $ => prec.right(PREC.UNARY, seq($.expr_primary, choice("++", "--"))),
    expr_assign: $ => prec.right(PREC.ASSIGN, seq(
      $.expr,
      choice("=", "+=", "-=", "*=", "/=", "<<=", ">>="),
      $.expr
    )),

    expr_primary: $ => choice(
      $.expr_paren,
      $.expr_dot_identifier,
      $.expr_literal,
      $.expr_initial,
      $.expr_fresh,
      $.expr_one,
      $.expr_return,
      $.expr_call
    ),
    expr_paren: $ => seq('(', $.expr, ')'),
    expr_dot_identifier: $ => seq($.identifier, optional(seq(".", $.identifier))),
    expr_literal: $ => choice(
      $.literal_int,
      $.literal_bool,
      $.literal_real,
      $.literal_bv,
      $.literal_enum
    ),
    expr_initial: $ => seq("initial", "(", $.expr_dot_identifier, ")"),
    expr_fresh: $ => seq("fresh", "(", $.identifier, ")"),
    expr_one: $ => seq("one", "(", $.expr, ',', comma_sep1($.expr), ")"), // expected least 2
    expr_return: $ => seq("return", $.expr), // prec.right(PREC.RETURN, seq("return", $.expr)),
    expr_call: $ => seq($.identifier, "(", comma_sep1($.expr), ")"), // expected 1 or more

    literal_int: $ => /[0-9]+/,
    literal_bool: $ => choice("true", "false"),
    literal_char: $ => seq('\'', $.possible_char, '\''),
    literal_string: $ => seq('"', repeat($.possible_char), '"'),
    literal_real: $ => /[0-9]+\.[0-9]+/,
    literal_bv: $ => choice($.bv_hex, $.bv_bin),
    literal_enum: $ => /#[a-zA-Z_][0-9a-zA-Z_]*/,

    possible_char: $ => choice($.escape_sequence, $.invalid_char),
    escape_sequence: $ => /\\(b|t|n|f|r|"|\\|\\\\|[0-3][0-7][0-7]|[0-7][0-7]|[0-7])/,
    invalid_char: $ => /[^\\"\r\n]/,
    bv_hex: $ => /0x[0-9a-fA-F]+/,
    bv_bin: $ => /0b[01]+/,
    identifier: $ => /[a-zA-Z_][0-9a-zA-Z_]*/,
  }
})

function comma_sep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}