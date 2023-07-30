const {ESLintUtils, TSESTree} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		/** @param {TSESTree.TSNonNullExpression | TSESTree.TSAsExpression} node */
		function cast(node) {
			if (
				'typeAnnotation' in node &&
				node.typeAnnotation.type === 'TSTypeReference' &&
				node.typeAnnotation.typeName.type === 'Identifier' &&
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
