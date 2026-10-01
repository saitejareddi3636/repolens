import Workspace from "../repolens/Workspace";
import example from "../repolens/example.json";
import type { Analysis } from "../repolens/model";
export default function Index() {
  return (
    <>
      <title>RepoLens — understand the code behind the product</title>
      <meta
        name="description"
        content="Explore a repository’s architecture, follow source-linked walkthroughs, and understand the code behind the product."
      />
      <Workspace analysis={example as Analysis} />
    </>
  );
}
