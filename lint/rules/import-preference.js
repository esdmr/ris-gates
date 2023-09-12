const path = require('node:path');
const {ESLintUtils, AST_NODE_TYPES} = require('@typescript-eslint/utils');

module.exports = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			ImportDeclaration(node) {
				if (
					!node.source.value.startsWith('.') ||
					!context.getPhysicalFilename
				) {
					return;
				}

				const filename = context.getPhysicalFilename();
				const resolved = path.resolve(
					path.dirname(filename),
					node.source.value,
				);

				const isUsingNamespaceImport = node.specifiers.every(
					(child) => child.type === AST_NODE_TYPES.ImportNamespaceSpecifier,
				);
				const shouldBeUsingNamespaceImport =
					/([/\\])src\1(?:component\1|lib\1(?:search-mode|tile-type))/.test(
						resolved,
					);

				if (isUsingNamespaceImport !== shouldBeUsingNamespaceImport) {
					context.report({
						node,
						messageId: shouldBeUsingNamespaceImport
							? 'useNamespace'
							: 'useNamed',
					});
				}

				if (isUsingNamespaceImport && shouldBeUsingNamespaceImport) {
					for (const child of node.specifiers) {
						if (child.local.name.endsWith('Js')) {
							context.report({
								node: child.local,
								messageId: 'refactoredWrongly',
							});
						} else if (child.local.name === 'eval') {
							context.report({
								node: child.local,
								messageId: 'evalIdentifier',
							});
						}
					}
				}
			},
		};
	},
	meta: {
		docs: {
			description: 'for consistency',
			recommended: 'warn',
		},
		messages: {
			useNamespace: 'Prefer namespace import for this module',
			useNamed: 'Prefer named import for this module',
			refactoredWrongly: 'Unexpected `Js` prefix for namespace import',
			evalIdentifier: 'Replace `eval` with `eval_`',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
