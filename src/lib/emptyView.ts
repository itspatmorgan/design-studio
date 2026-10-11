// What a new view exports until something is built in it: `export default emptyView`. The platform
// recognizes it and shows its own "This view is empty" page, with a prompt to hand your agent
// (src/platform/modules/view/EmptyView.tsx), so the view doesn't have to draw one.
// New views and prototypes start with it (src/platform/node/build/vite-files-plugin.js, src/platform/node/templates/prototype/).
//
// Agents: when you build the view, replace `export default emptyView` with the component you write, and
// remove the import. Nothing else needs to change.
export const emptyView = () => null;
