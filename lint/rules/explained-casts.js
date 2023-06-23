/* eslint-disable unicorn/prefer-module */
// eslint-disable-next-line no-unused-vars
const {ESLintUtils, TSESTree} = require('@typescript-eslint/utils');

// Type: RuleModule<"uppercase", ...>
module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		/** @param {TSESTree.TSNonNullExpression | TSESTree.TSAsExpression} node */
		const cast = (node) => {
			if (
				'typeAnnotation' in node &&
				node.typeAnnotation.type === 'TSTypeReference' &&
				node.typeAnnotation.typeName.type === 'Identifier' &&
				node.typeAnnotation.typeName.name === 'const'
			) {
				return;
			}

			/** @type {TSESTree.Node} */
			let anyNode = node;

			do {
				/** @type {TSESTree.Node | undefined} */
				const parent = anyNode.parent;

				if (!parent) {
					context.report({
						messageId: 'noParent',
						node,
					});
					return;
				}

				anyNode = parent;
			} while (
				!anyNode.type.endsWith('Statement') &&
				anyNode.type !== 'VariableDeclaration'
			);

			for (const item of context.getSourceCode().getCommentsBefore(anyNode)) {
				if (/^cast safety: .{3}/i.test(item.value.trim())) {
					return;
				}
			}

			context.report({
				messageId: 'cast',
				node,
			});
		};

		return {
			TSNonNullExpression: cast,
			TSAsExpression: cast,
		};
	},
	meta: {
		docs: {
			description:
				'This type cast should be documented with a `// Cast safety:` comment.',
			recommended: 'warn',
		},
		messages: {
			cast: 'Unexplained cast',
			noParent: 'Expression is not in a statement somehow',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
