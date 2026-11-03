/** @import {Rule} from 'eslint' */

/**
 * Checks if a node is a function that can be a top-level declaration.
 *
 * @param {unknown} node - Any AST node, or nothing.
 * @returns {boolean} True for arrow functions and function expressions.
 */
const isFunctionExpression = (node) =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression');

/**
 * Allows one top-level function per file. Nested helpers are allowed.
 *
 * @type {Rule.RuleModule}
 */
const oneFunctionPerFile = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Allow only one top-level function in each file',
    },
    schema: [],
    messages: {
      tooMany:
        'Only 1 top-level function is allowed per file. Found {{count}}.',
    },
  },
  create: (context) => ({
    Program: (program) => {
      /** @type {Rule.Node[]} */
      const functions = [];
      for (const statement of program.body) {
        const declaration =
          statement.type === 'ExportNamedDeclaration' ||
          statement.type === 'ExportDefaultDeclaration'
            ? statement.declaration
            : statement;
        if (!declaration) {
          continue;
        }
        if (
          declaration.type === 'FunctionDeclaration' ||
          isFunctionExpression(declaration)
        ) {
          functions.push(declaration);
          continue;
        }
        if (declaration.type === 'VariableDeclaration') {
          for (const declarator of declaration.declarations) {
            if (isFunctionExpression(declarator.init)) {
              functions.push(declarator);
            }
          }
        }
      }
      if (functions.length <= 1) {
        return;
      }
      for (const node of functions.slice(1)) {
        context.report({
          node,
          messageId: 'tooMany',
          data: { count: String(functions.length) },
        });
      }
    },
  }),
};

export default oneFunctionPerFile;
