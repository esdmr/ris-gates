const {
	ESLintUtils,
	TSESTree,
	AST_NODE_TYPES,
} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		/** @param {TSESTree.TSNonNullExpression | TSESTree.TSAsExpression} node */
		function cast(node) {
			if (
				node.type === AST_NODE_TYPES.TSAsExpression &&
				node.typeAnnotation.type === AST_NODE_TYPES.TSTypeReference &&
				node.typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier &&
				node.typeAnnotation.typeName.name === 'const'
			) {
				return;
			}

			for (
				let i = /** @type {TSESTree.Node | undefined} */ (node);
				i;
				i = i.parent
			) {
				for (const item of context.getSourceCode().getCommentsBefore(i)) {
					if (/^cast safety: .{3}/i.test(item.value.trim())) {
						return;
					}
				}
			}

			context.report({
				messageId: 'cast',
				node,
			});
		}

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
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
