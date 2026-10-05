// Chart list, in page order. To add a chart: create charts/<name>.js exporting
// { id, title, description, render(root, data) } and add one line here.
import map from "./map.js";
import regions from "./regions.js";
import regionsGrouped from "./regions-grouped.js";
import contribution from "./contribution.js";
import contributionByCandidate from "./contribution-by-candidate.js";

export default [map, regions, regionsGrouped, contribution, contributionByCandidate];
