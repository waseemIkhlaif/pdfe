// Bans direct use of wall-clock time, randomness and random IDs outside packages/platform-core (research R-13).
const norm = (f) => f.split(String.fromCharCode(92)).join('/');

export default {
  meta: {
    type: 'problem',
    messages: {
      banned: 'Use the injected ClockService, RandomService or IdGenerator from @pdfe/platform-core instead of {{what}}.',
    },
    schema: [],
  },
  create(context) {
    if (norm(context.filename).includes('packages/platform-core/')) return {};
    const isId = (n, name) => n.type === 'Identifier' && n.name === name;
    return {
      CallExpression(node) {
        const c = node.callee;
        if (c.type !== 'MemberExpression' || c.computed) return;
        const prop = c.property.name;
        if (isId(c.object, 'Date') && prop === 'now') context.report({ node, messageId: 'banned', data: { what: 'Date.now()' } });
        else if (isId(c.object, 'Math') && prop === 'random') context.report({ node, messageId: 'banned', data: { what: 'Math.random()' } });
        else if (prop === 'randomUUID') context.report({ node, messageId: 'banned', data: { what: 'crypto.randomUUID()' } });
      },
      NewExpression(node) {
        if (isId(node.callee, 'Date') && node.arguments.length === 0) {
          context.report({ node, messageId: 'banned', data: { what: 'new Date() with no argument' } });
        }
      },
    };
  },
};
