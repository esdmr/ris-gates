const assert = require('node:assert');
const {ESLintUtils, AST_TOKEN_TYPES} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			ImportDeclaration(node) {
				if (
					node.importKind === 'type' ||
					node.specifiers.length === 0 ||
					node.specifiers.some(
						(child) =>
							child.type !== 'ImportSpecifier' ||
							child.importKind !== 'type',
					)
				) {
					return;
				}

				context.report({
					node,
					messageId: 'typeImportStyle',
					*fix(fixer) {
						const source = context.getSourceCode();

						const importToken = source.getFirstToken(node);
						assert(importToken);
						assert(importToken.type === AST_TOKEN_TYPES.Keyword);
						assert(importToken.value === 'import');

						yield fixer.insertTextAfter(importToken, ' type');

						for (const child of node.specifiers) {
							const typeToken = source.getFirstToken(child);
							assert(typeToken);
							assert(
								typeToken.type === AST_TOKEN_TYPES.Identifier,
							);
							assert(typeToken.value === 'type');

							yield fixer.remove(typeToken);
						}
					},
				});
			},
		};
	},
	meta: {
		docs: {
			description: 'for consistency',
			recommended: 'warn',
		},
		fixable: 'code',
		messages: {
			typeImportStyle: 'Type-only imports should use `import type`',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
