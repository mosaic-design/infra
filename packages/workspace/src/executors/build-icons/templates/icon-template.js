const iconTemplate = (variables, { tpl }) => {
    variables.exports[0].declaration.name = variables.exports[0].declaration.name.replace('Mc', '');
    variables.componentName = variables.componentName.replace('Mc', '');
    variables.jsx.openingElement.attributes.push({
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'fill' },
        value: { type: 'StringLiteral', value: 'currentColor' }
    });
    return tpl`
${variables.imports};

${variables.interfaces};

const ${variables.componentName} = (${variables.props}) => (
  ${variables.jsx}
);

${variables.componentName}.displayName = '${variables.componentName}'
${variables.exports};
`;
};

module.exports = iconTemplate;
