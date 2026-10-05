// Chart list, in page order. To add a chart: create charts/<name>.js exporting
// { id, title, description, render(root, data) } and add one line here.
import contribution from "./contribution.js";
import contributionByCandidate from "./contribution-by-candidate.js";

export default [contribution, contributionByCandidate];
