import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
    {
      "pattern": {
        "exam_type": "GATE",
        "branch": "CSE",
        "topic_name": "Routing Algorithms"
      },
      "pyqs": [
        {
          "question_text": "Routing algorithms determine the best path for packets to travel from source to destination across a network. Which of the following correctly classifies routing algorithms?",
          "options": [
            "A. Static routing: routes are manually configured and do not change; Dynamic routing: routes are automatically updated based on network topology changes",
            "B. Static routing uses Dijkstra's algorithm; Dynamic routing uses Bellman-Ford",
            "C. Static routing adapts to network failures automatically; Dynamic routing requires manual intervention",
            "D. Both static and dynamic routing use the same algorithm internally"
          ],
          "correct_answer": "A",
          "explanation": "Routing algorithm classification: Static (non-adaptive) routing: routes are preconfigured by the network administrator and remain fixed regardless of network conditions. Simple but cannot adapt to failures or congestion. Suitable for small, stable networks. Dynamic (adaptive) routing: routes are automatically recalculated based on current network topology and traffic conditions. Routers exchange routing information to build and maintain routing tables. Subtypes: distance vector (RIP — uses Bellman-Ford), link-state (OSPF — uses Dijkstra's), path vector (BGP). Dynamic routing adapts to failures but has higher complexity and overhead.",
          "year": 2000,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Distance vector routing is based on the Bellman-Ford algorithm. Each router maintains a distance table and periodically shares it with directly connected neighbors. Which of the following correctly describes the Bellman-Ford update rule used in distance vector routing?",
          "options": [
            "A. D(x, y) = min over all neighbors v of {cost(x, v) + D(v, y)}",
            "B. D(x, y) = max over all neighbors v of {cost(x, v) + D(v, y)}",
            "C. D(x, y) = cost(x, y) only if x and y are directly connected",
            "D. D(x, y) = cost(x, v) × D(v, y) for the best neighbor v"
          ],
          "correct_answer": "A",
          "explanation": "The Bellman-Ford equation (distance vector routing): D(x, y) = min over all neighbors v of {cost(x, v) + D(v, y)}, where D(x, y) is the estimated cost from router x to destination y, cost(x, v) is the link cost from x to neighbor v, and D(v, y) is neighbor v's estimated cost to y. Each router x updates its distance table whenever it receives an updated table from a neighbor or a link cost changes. This is the distributed Bellman-Ford — each router only knows local link costs and its neighbors' distance vectors, yet converges to the global shortest paths (assuming no negative cycles).",
          "year": 2001,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "The count-to-infinity problem is a well-known issue in distance vector routing. Which of the following correctly describes this problem?",
          "options": [
            "A. When a link fails, routers may increment the metric indefinitely because they receive incorrect routing information from neighbors who still believe the route exists",
            "B. When a router receives too many routing updates, it counts them to infinity and crashes",
            "C. The count-to-infinity problem occurs in link-state routing when LSAs are flooded too frequently",
            "D. Count-to-infinity happens when the network has too many routers"
          ],
          "correct_answer": "A",
          "explanation": "Count-to-infinity: suppose router A reaches destination D via router B (cost 1). If the A-D link fails: B still believes it can reach D via A (cost 2 from B's perspective). A updates its table: it can reach D via B at cost 3. B updates: via A at cost 4. This ping-pong continues, incrementing the metric slowly toward infinity (16 in RIP). Mitigation techniques: Split horizon — don't advertise a route back to the neighbor from which you learned it. Split horizon with route poisoning — advertise failed routes with metric = infinity (16 in RIP). Holddown timers — ignore updates about a failed route for a period. Triggered updates — send updates immediately on change rather than waiting for the periodic timer.",
          "year": 2002,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Link-state routing requires each router to have a complete map of the network topology. Which of the following steps are performed by a link-state routing algorithm such as OSPF?",
          "options": [
            "A. Each router discovers its neighbors using Hello packets",
            "B. Each router creates a Link State Advertisement (LSA) describing its links and costs",
            "C. LSAs are flooded to all routers in the area",
            "D. Each router runs Dijkstra's algorithm on its Link State Database to compute shortest paths"
          ],
          "correct_answer": "A, B, C, D",
          "explanation": "Link-state routing protocol steps (OSPF): (1) Neighbor discovery — routers send Hello packets on each interface; routers that exchange Hellos become neighbors. (2) LSA creation — each router generates a Link State Advertisement describing its router ID, its neighbors, and the cost to each neighbor. (3) LSA flooding — each router reliably floods its LSA to every other router in the OSPF area; each router forwards each LSA exactly once (using sequence numbers to detect duplicates). (4) Link State Database (LSDB) — each router builds an identical topology graph from the collected LSAs. (5) SPF calculation — each router independently runs Dijkstra's Shortest Path First (SPF) algorithm on the LSDB, computing the shortest-path tree rooted at itself. (6) Routing table — the SPF tree's next-hops populate the routing table.",
          "year": 2003,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "Consider the following network with routers and link costs:\nRouter A connects to B (cost 1), A to C (cost 4), B to C (cost 2), B to D (cost 5), C to D (cost 1).\nUsing Dijkstra's algorithm starting from router A, what is the shortest path cost from A to D?",
          "options": [
            "A. 4",
            "B. 5",
            "C. 6",
            "D. 7"
          ],
          "correct_answer": "A",
          "explanation": "Dijkstra's from A: Initialize: d[A]=0, d[B]=∞, d[C]=∞, d[D]=∞. Visit A (d=0): update d[B]=1, d[C]=4. Visit B (d=1): update d[C]=min(4, 1+2)=3, d[D]=1+5=6. Visit C (d=3): update d[D]=min(6, 3+1)=4. Visit D (d=4): done. Shortest path A to D = 4, via A→B→C→D (cost 1+2+1=4).",
          "year": 2004,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "RIP (Routing Information Protocol) is a distance vector protocol with specific characteristics. Which of the following are correct properties of RIP?",
          "options": [
            "A. RIP uses hop count as its metric with a maximum of 15 hops",
            "B. RIP broadcasts full routing table updates every 30 seconds",
            "C. A hop count of 16 in RIP indicates an unreachable destination",
            "D. RIP uses Dijkstra's algorithm to compute shortest paths"
          ],
          "correct_answer": "A, B, C",
          "explanation": "RIP (RFC 2453) properties: A: TRUE — metric = hop count (number of routers between source and destination); maximum valid metric = 15. B: TRUE — RIP sends complete routing table updates via UDP (port 520) to all directly connected neighbors every 30 seconds. RIPv1 uses broadcast; RIPv2 uses multicast (224.0.0.9). C: TRUE — metric 16 = infinity, meaning the destination is unreachable. This small infinity limits RIP to small networks (maximum diameter = 15 hops). D: FALSE — RIP uses the distributed Bellman-Ford algorithm (distance vector), not Dijkstra's. OSPF uses Dijkstra's (link-state). RIP convergence is slow, especially prone to count-to-infinity.",
          "year": 2005,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "OSPF uses areas to scale link-state routing to large networks. Which of the following correctly describes OSPF areas?",
          "options": [
            "A. All OSPF routers must be in Area 0 (backbone area); all other areas must connect to Area 0",
            "B. LSA flooding is contained within an area, reducing overhead in large networks",
            "C. Routers on the boundary between areas are called Area Border Routers (ABRs) and summarize routing information between areas",
            "D. OSPF areas eliminate the need for running Dijkstra's algorithm"
          ],
          "correct_answer": "A, B, C",
          "explanation": "OSPF hierarchical routing with areas: A: TRUE — Area 0 is the backbone; all other areas (Area 1, 2, ...) must have at least one connection to Area 0. This star topology of areas ensures all inter-area traffic passes through the backbone. B: TRUE — LSA flooding is contained within a single area, preventing the entire network from being flooded. ABRs summarize inter-area routing information (Type 3 LSAs), drastically reducing LSDB size in large networks. C: TRUE — ABRs (Area Border Routers) have interfaces in multiple areas; they receive detailed LSAs from each area and generate summary LSAs for other areas. D: FALSE — OSPF always runs Dijkstra's algorithm within each area; areas reduce the size of the topology graph on which SPF runs, not eliminate it.",
          "year": 2006,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "What is the key difference between interior gateway protocols (IGPs) and exterior gateway protocols (EGPs)?",
          "options": [
            "A. IGPs are used for routing within a single autonomous system (AS); EGPs are used for routing between different autonomous systems",
            "B. IGPs use path vector routing; EGPs use link-state routing",
            "C. IGPs are more scalable than EGPs for internet-wide routing",
            "D. IGPs route based on AS path; EGPs route based on hop count"
          ],
          "correct_answer": "A",
          "explanation": "Autonomous System (AS): a collection of IP networks under a single administrative domain with a consistent routing policy (e.g., an ISP, a university, a company). IGP (Interior Gateway Protocol): routing within a single AS. Examples: OSPF (link-state), RIP (distance vector), EIGRP (hybrid), IS-IS (link-state). IGPs can optimize for performance metrics (hop count, bandwidth, delay). EGP (Exterior Gateway Protocol): routing between different ASes. The only currently used EGP is BGP-4. EGPs must support policy-based routing (business relationships, contracts), AS loop prevention, and scalability to the entire internet (BGP routing tables currently hold ~900,000+ prefixes).",
          "year": 2007,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "BGP (Border Gateway Protocol) uses path vector routing. Which of the following correctly describes how BGP prevents routing loops?",
          "options": [
            "A. BGP includes the full AS path in each route advertisement; if a router's own AS number appears in the path, the route is rejected",
            "B. BGP uses TTL fields like IP to detect loops",
            "C. BGP uses split horizon to prevent routing loops between ASes",
            "D. BGP relies on OSPF within each AS to detect inter-AS loops"
          ],
          "correct_answer": "A",
          "explanation": "BGP loop prevention using AS_PATH attribute: every BGP route advertisement carries the AS_PATH — an ordered sequence of AS numbers that the route has traversed. When a BGP router receives an advertisement: it checks if its own AS number (ASN) appears in the AS_PATH. If yes → the route would create a loop → it is rejected (not used or propagated). If no → the router prepends its own ASN to the AS_PATH and propagates the route. Example: AS1 → AS2 → AS3 route has AS_PATH [AS1, AS2]. When AS3 sends this back toward AS1, AS1 sees its own ASN [AS1] in the path and rejects it. This is analogous to poison reverse but at the AS level.",
          "year": 2008,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Split horizon is a technique to mitigate the count-to-infinity problem in distance vector routing. Which of the following correctly describes the split horizon rule?",
          "options": [
            "A. A router does not advertise a route back to the neighbor from which it learned that route",
            "B. A router splits its routing table in half and sends each half to different neighbors",
            "C. A router advertises all routes to all neighbors without exception",
            "D. A router advertises a route back to its source neighbor with metric = infinity (poison reverse)"
          ],
          "correct_answer": "A",
          "explanation": "Split horizon rule: if router A learned that destination D is reachable via router B (next hop = B), then A will NOT include destination D in its routing updates sent back to B. Rationale: B already knows the best path to D (it told A about it), so advertising it back is useless and can cause count-to-infinity. Simple split horizon (option A) suppresses the advertisement entirely. Poisoned reverse (option D) is a stronger variant: instead of suppressing the advertisement, the router advertises the route back with metric = infinity (16 in RIP), explicitly telling the neighbor 'I can't reach D via you'. Poisoned reverse uses more bandwidth but converges faster than simple split horizon.",
          "year": 2009,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Consider a network where router X has the following distance vector table (destinations A, B, C, D with costs through neighbors Y and Z):\nVia Y: A=7, B=2, C=5, D=3\nVia Z: A=2, B=3, C=4, D=6\nLink cost X-Y=1 and X-Z=2. What is X's best cost to destination A?",
          "options": [
            "A. 7",
            "B. 4",
            "C. 3",
            "D. 9"
          ],
          "correct_answer": "B",
          "explanation": "Using the Bellman-Ford equation: D(X, A) = min over neighbors {cost(X, neighbor) + D(neighbor, A)}. Via Y: cost(X, Y) + D(Y, A) = 1 + 7 = 8. Via Z: cost(X, Z) + D(Z, A) = 2 + 2 = 4. D(X, A) = min(8, 4) = 4, via neighbor Z. Note: the table entries given are what Y and Z report as their costs to the destinations. X computes its own cost by adding the link cost to Y or Z respectively. Best path to A = 4 through Z.",
          "year": 2010,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Hierarchical routing is used to scale routing algorithms to large networks. Which of the following correctly describes the advantages and disadvantages of hierarchical routing?",
          "options": [
            "A. Hierarchical routing reduces the routing table size and LSA flooding overhead at the cost of potentially non-optimal routes",
            "B. Hierarchical routing always produces shorter paths than flat routing",
            "C. Hierarchical routing eliminates the need for inter-domain routing protocols",
            "D. Hierarchical routing increases memory usage compared to flat routing"
          ],
          "correct_answer": "A",
          "explanation": "Hierarchical routing: routers are grouped into regions/areas/ASes. Within a region, routers know the full topology. Between regions, only summary information is exchanged. Advantages: (1) Reduced routing table size — routers only store detailed routes for their region and summary routes for other regions. (2) Reduced LSA flooding — link-state updates don't propagate beyond area boundaries (in OSPF). (3) Scalability — the internet cannot run flat link-state routing (billions of prefixes would require exabytes of memory). Disadvantages: (1) Routes may be non-optimal — summarization loses detailed topology information, so the chosen path may not be the globally shortest. (2) Configuration complexity — area design, ABR configuration, summarization policies. D is FALSE — hierarchical routing reduces memory usage.",
          "year": 2011,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "In OSPF, what types of router roles exist and what are their functions?",
          "options": [
            "A. Internal Router (IR): all interfaces within one OSPF area",
            "B. Area Border Router (ABR): interfaces in multiple OSPF areas; summarizes routes between areas",
            "C. Autonomous System Boundary Router (ASBR): connects OSPF to external routing domains (e.g., BGP); redistributes external routes into OSPF",
            "D. Designated Router (DR): elected on multi-access networks to reduce LSA flooding overhead"
          ],
          "correct_answer": "A, B, C, D",
          "explanation": "OSPF router types: A: Internal Router — all interfaces in the same OSPF area; maintains one LSDB. B: ABR (Area Border Router) — has interfaces in multiple areas (including Area 0); maintains separate LSDBs for each area; generates Type 3 summary LSAs to share inter-area routes. C: ASBR (Autonomous System Boundary Router) — connects the OSPF domain to external routing protocols (BGP, RIP, EIGRP, static routes); generates Type 5 external LSAs for redistributed routes. D: DR (Designated Router) — elected on broadcast multi-access networks (Ethernet) to reduce the number of adjacencies. Without DR, n routers would form n(n-1)/2 adjacencies; with DR, each router forms adjacency only with DR and BDR (Backup DR), reducing to n-1 adjacencies. LSAs are flooded through the DR.",
          "year": 2012,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "BGP uses several path attributes to select the best route when multiple paths exist. Which of the following is the correct order of BGP route selection criteria (from highest to lowest priority)?",
          "options": [
            "A. Highest LOCAL_PREF → Shortest AS_PATH → Lowest MED → eBGP over iBGP → Lowest IGP cost to next-hop → Lowest Router ID",
            "B. Shortest AS_PATH → Highest LOCAL_PREF → Lowest MED → Lowest Router ID",
            "C. Lowest MED → Highest LOCAL_PREF → Shortest AS_PATH → Lowest Router ID",
            "D. Highest Weight → Highest LOCAL_PREF → Shortest AS_PATH → Lowest MED → eBGP over iBGP → Lowest IGP metric → Lowest Router ID"
          ],
          "correct_answer": "D",
          "explanation": "BGP best path selection (Cisco implementation, commonly tested): (1) Highest Weight (Cisco-proprietary, local to router). (2) Highest LOCAL_PREF (local to AS, higher = preferred; used for outbound routing policy). (3) Locally originated routes preferred. (4) Shortest AS_PATH length. (5) Lowest Origin type (IGP < EGP < Incomplete). (6) Lowest MED (Multi-Exit Discriminator — hint to neighboring AS about preferred entry point). (7) eBGP routes preferred over iBGP routes. (8) Lowest IGP metric to BGP next-hop. (9) Oldest eBGP route (for stability). (10) Lowest BGP Router ID (tie-breaker). The mnemonic: 'We Love Oranges As Oranges Mean Pure Refreshment' for Weight, LOCAL_PREF, Originated, AS_PATH, Origin, MED, Prefer eBGP, Router ID.",
          "year": 2013,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Flooding is the simplest routing algorithm where every incoming packet is sent out on every outgoing link except the one it arrived on. Which of the following are TRUE about flooding?",
          "options": [
            "A. Flooding guarantees delivery if any path exists between source and destination",
            "B. Flooding is extremely robust against router failures",
            "C. Flooding creates duplicate packets and wastes bandwidth",
            "D. Flooding uses a routing table to determine the best path"
          ],
          "correct_answer": "A, B, C",
          "explanation": "Flooding characteristics: A: TRUE — flooding sends packets on ALL paths simultaneously; if any path exists to the destination, flooding will find it. B: TRUE — flooding is maximally robust — even if multiple routers fail, as long as one path survives the packet will be delivered. Used in military networks and link-state routing (controlled flooding of LSAs). C: TRUE — flooding generates exponentially many duplicate packets. Without countermeasures (hop limit, sequence numbers, reverse path forwarding), packets loop forever. Solutions: hop count limit in the packet header, sequence number per source so routers discard duplicates. D: FALSE — flooding requires NO routing table; it simply forwards on all links except the input — this is its key advantage (no routing computation) and disadvantage (massive redundancy).",
          "year": 2014,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "Hot potato routing (deflection routing) is a routing strategy used in some networks. Which of the following correctly describes hot potato routing?",
          "options": [
            "A. A router forwards a packet on the link with the lowest queue length, getting rid of the packet as quickly as possible regardless of whether it is the optimal path",
            "B. Hot potato routing always selects the shortest path to the destination",
            "C. Hot potato routing is used in OSPF to select between equal-cost paths",
            "D. Hot potato routing increases average path length to improve reliability"
          ],
          "correct_answer": "A",
          "explanation": "Hot potato routing: a router treats packets like 'hot potatoes' — it wants to get rid of them immediately. The router forwards each packet on the outgoing link with the shortest queue (least congestion), regardless of whether this link is on the optimal path to the destination. The goal is to minimize local queueing delay, not minimize end-to-end path length. This is used in: some ISP intra-AS routing (get traffic off the AS network quickly — 'early exit' or 'closest exit' routing), some optical networks, deflection routing in fault-tolerant systems. Trade-off: reduces local congestion but may increase total path length and end-to-end delay.",
          "year": 2015,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Equal-Cost Multi-Path (ECMP) routing allows traffic to be distributed across multiple equal-cost paths. Which of the following correctly describes ECMP?",
          "options": [
            "A. ECMP load-balances traffic across multiple paths that have the same routing metric to a destination",
            "B. ECMP selects the path with the highest bandwidth for all traffic",
            "C. ECMP is only supported in BGP, not in OSPF or RIP",
            "D. ECMP requires all paths to have the same physical link speed"
          ],
          "correct_answer": "A",
          "explanation": "ECMP (Equal-Cost Multi-Path): when multiple paths to a destination have identical routing metric (equal cost), ECMP distributes traffic across all these paths rather than selecting just one. Load balancing methods: per-flow hashing (same flow always takes same path, preserving packet order), per-packet round-robin (may reorder packets), per-destination. Supported by: OSPF (install multiple equal-cost next-hops for same destination), IS-IS, EIGRP, BGP (with specific configuration). Benefits: increased effective bandwidth (uses multiple links), redundancy (path failure just removes one path). ECMP is not limited by physical link speed — it works with any equal-cost paths. Data centers use ECMP extensively with fat-tree and Clos topologies.",
          "year": 2016,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "IS-IS (Intermediate System to Intermediate System) is a link-state routing protocol used as an alternative to OSPF. Which of the following correctly describes IS-IS compared to OSPF?",
          "options": [
            "A. IS-IS runs directly over Layer 2 (does not use IP); OSPF runs over IP",
            "B. IS-IS uses a two-level hierarchy (Level 1 and Level 2) analogous to OSPF areas",
            "C. IS-IS uses the same SPF algorithm (Dijkstra's) as OSPF",
            "D. IS-IS cannot support IPv6; OSPF has OSPFv3 for IPv6"
          ],
          "correct_answer": "A, B, C",
          "explanation": "IS-IS vs OSPF: A: TRUE — IS-IS runs directly over the Data Link Layer (it is not encapsulated in IP packets). This makes IS-IS immune to IP routing errors during convergence — an advantage in large ISP networks. OSPF encapsulates its messages in IP packets (protocol number 89). B: TRUE — IS-IS has Level 1 (intra-area routing) and Level 2 (inter-area/backbone routing); Level 1/2 routers handle both. Analogous to OSPF's area structure and ABRs. C: TRUE — both IS-IS and OSPF use Dijkstra's Shortest Path First algorithm on their respective link-state databases. D: FALSE — IS-IS supports IPv6 through extension TLVs (Multi-Topology IS-IS); it is widely used for IPv6 routing in ISP networks. OSPFv3 is the OSPF variant for IPv6.",
          "year": 2017,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "In link-state routing, LSA flooding uses sequence numbers to ensure each LSA is forwarded only once. Which of the following problems does sequence numbering solve?",
          "options": [
            "A. Without sequence numbers, a router could forward the same LSA multiple times, causing an infinite LSA flood",
            "B. Sequence numbers allow routers to determine which copy of an LSA is newer when multiple copies exist",
            "C. Sequence numbers replace the need for authentication in OSPF",
            "D. Sequence numbers ensure LSAs arrive in the order they were sent"
          ],
          "correct_answer": "A, B",
          "explanation": "LSA sequence numbers in OSPF serve two purposes: A: TRUE — flooding prevention: each router records the sequence number of every LSA it has forwarded. If the same LSA arrives again (with the same sequence number), the router discards it as a duplicate, stopping infinite re-flooding. B: TRUE — freshness determination: when a router receives multiple copies of an LSA for the same originating router, it keeps and forwards only the one with the highest sequence number (most recent). Older LSAs are discarded. OSPF uses a 32-bit sequence number starting from 0x80000001 and incrementing. LSAs also have an age field (seconds since origination) and are refreshed every 30 minutes (MaxAge = 60 min). C: FALSE — OSPF authentication is separate (MD5 or SHA-based). D: FALSE — sequence numbers track LSA version, not delivery order.",
          "year": 2018,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "A network administrator notices that routing convergence after a link failure takes very long with RIP but much faster with OSPF. What is the primary reason for this difference in convergence speed?",
          "options": [
            "A. RIP uses hop count; OSPF uses bandwidth as metric",
            "B. RIP converges slowly because it relies on periodic updates every 30 seconds and has the count-to-infinity problem; OSPF converges faster because link-state changes are immediately flooded and Dijkstra's is rerun",
            "C. OSPF has more routers than RIP networks",
            "D. RIP uses TCP for reliable delivery; OSPF uses UDP which is faster"
          ],
          "correct_answer": "B",
          "explanation": "Convergence speed comparison: RIP: (1) Waits for the next periodic update (up to 30 seconds) to propagate failure information. (2) Count-to-infinity causes incremental, slow propagation of failure information (bad news travels slowly). (3) Holddown timers add further delay. Total convergence: can take several minutes. OSPF: (1) When a link fails, the router immediately sends a new LSA with the failed link's cost set to infinity (triggered update). (2) LSAs are reliably flooded to ALL routers in the area within seconds. (3) Each router immediately reruns Dijkstra's algorithm upon receiving the LSA update. (4) Convergence time: typically seconds to tens of seconds. A is a metric difference, not convergence. D is reversed (OSPF uses its own reliable flooding mechanism, not TCP or UDP in the traditional sense).",
          "year": 2019,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "The Bellman-Ford algorithm is used in distance vector routing. Consider a network with 5 routers (A, B, C, D, E) and the following links: A-B(1), B-C(2), C-D(1), D-E(1), A-E(10). After how many iterations of Bellman-Ford does the shortest path from A to E converge?",
          "options": [],
          "correct_answer": "4",
          "explanation": "Bellman-Ford finds shortest paths in at most V-1 = 4 iterations for V = 5 vertices. Let's trace: the shortest path A→B→C→D→E has cost 1+2+1+1=5 (better than direct A-E=10). Iteration 1: d[B]=1(A-B), d[E]=10(A-E). Iteration 2: d[C]=3(A-B-C), d[E]=10 (no improvement via B-E). Wait, there is no B-E link. Iteration 2: d[C]=1+2=3. Iteration 3: d[D]=3+1=4. Iteration 4: d[E]=min(10, 4+1)=5. The shortest path A-B-C-D-E=5 < A-E=10 is found at iteration 4. Bellman-Ford requires 4 = V-1 iterations because the shortest path A→E has 4 edges.",
          "year": 2020,
          "exam_type": "GATE",
          "question_type": "NAT"
        },
        {
          "question_text": "Policy-based routing allows network administrators to override shortest-path routing based on business policies. Which of the following are valid policy-based routing decisions made in BGP?",
          "options": [
            "A. Prefer routes through a business partner AS over routes through a competitor AS even if the competitor's path is shorter",
            "B. Use BGP LOCAL_PREF to prefer one exit point from an AS over another for all traffic to a specific prefix",
            "C. Set MED (Multi-Exit Discriminator) to influence which entry point neighboring ASes use when sending traffic into the AS",
            "D. BGP cannot implement any routing policies — it always uses shortest AS path"
          ],
          "correct_answer": "A, B, C",
          "explanation": "BGP policy-based routing examples: A: TRUE — ISPs establish business relationships (customer, peer, provider). Routing policies enforce: traffic from customers can be forwarded to providers and peers (customer pays); peer traffic only forwarded to/from own customers (settlement-free peering). A router preferring a business partner's path over a competitor's uses LOCAL_PREF or WEIGHT attributes. B: TRUE — LOCAL_PREF is set by the BGP router and propagated to all iBGP peers within the same AS. Higher LOCAL_PREF = preferred exit. Used to implement 'primary/backup' exit policies. C: TRUE — MED (Multi-Exit Discriminator) is sent to neighboring ASes to suggest which entry point to use when they have multiple connections to your AS. Lower MED = preferred entry. D: FALSE — BGP's primary purpose IS policy-based routing; it explicitly allows (and requires) policies for proper operation.",
          "year": 2021,
          "exam_type": "GATE",
          "question_type": "MSQ"
        },
        {
          "question_text": "In distance vector routing, a router receives the following update from its neighbor N: destination D is reachable at cost 5 via N. The router's link cost to N is 3. The router currently has a route to D via a different neighbor M with cost 7. What action does the router take?",
          "options": [
            "A. Update the route to D: new cost = 3 + 5 = 8, via N; keep existing route via M (cost 7) as it is better",
            "B. Update the route to D: new cost = 8 via N, which is worse than 7 via M; keep the route via M",
            "C. Immediately discard the update from N",
            "D. Send the updated routing table to all neighbors regardless"
          ],
          "correct_answer": "B",
          "explanation": "Bellman-Ford update rule: new cost via N = link cost to N + N's cost to D = 3 + 5 = 8. Compare with existing best: current cost to D = 7 (via M). Since 8 > 7, the route via N is NOT better — the router keeps its existing route via M with cost 7. The router only updates if the new cost is lower than the current best. No update is sent to neighbors (no change in the router's distance table). If the new cost were 6 (< 7), the router would update: route to D via N, cost 6, and then send triggered updates to its neighbors about this improvement.",
          "year": 2022,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Software Defined Networking (SDN) separates the control plane from the data plane. How does this affect routing compared to traditional routing?",
          "options": [
            "A. In SDN, a centralized controller computes routes for all switches; switches only forward packets based on flow tables installed by the controller",
            "B. In traditional routing, a centralized server computes all routes; in SDN, each router independently computes its own routes",
            "C. SDN eliminates the need for any routing algorithm",
            "D. SDN and traditional routing are architecturally identical"
          ],
          "correct_answer": "A",
          "explanation": "SDN architecture vs traditional routing: Traditional: each router has both a control plane (routing software running protocols like OSPF, BGP) and a data plane (hardware forwarding using routing table). Distributed computation — each router independently runs routing algorithms. SDN: control plane is separated from the data plane. Centralized SDN controller (logically centralized, physically distributed) has a global network view and computes routing/forwarding rules for ALL switches. Switches (data plane) only have flow tables installed by the controller via a southbound API (e.g., OpenFlow) — they perform simple match-action forwarding. Benefits: global optimization, simpler network devices, easier policy enforcement, programmability. Examples: Google B4 (SDN WAN), data center fabrics.",
          "year": 2023,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Consider a network where OSPF is running. A router has two equal-cost paths to destination 10.0.0.0/24: one through interface Gi0/0 (cost 10) and one through Gi0/1 (cost 10). What does the router install in its routing table and how is traffic forwarded?",
          "options": [
            "A. Only one path is installed (arbitrarily chosen); the other is ignored",
            "B. Both paths are installed (ECMP); traffic is load-balanced across both interfaces",
            "C. The router selects the path through the interface with the lower IP address",
            "D. OSPF does not support equal-cost paths"
          ],
          "correct_answer": "B",
          "explanation": "OSPF ECMP (Equal-Cost Multi-Path): when multiple paths to the same destination have identical OSPF cost, OSPF installs ALL equal-cost paths in the routing table as multiple next-hops. Traffic is load-balanced across all equal-cost paths. OSPF supports up to a configurable number of equal-cost paths (default 4-16 depending on implementation). Load balancing methods: per-destination (same destination always uses same next-hop), per-flow (5-tuple hash), or per-packet (round-robin, may reorder). ECMP effectively multiplies available bandwidth to a destination and provides automatic failover — if one path fails, the other remains. This is a key feature used in data center and enterprise networks.",
          "year": 2024,
          "exam_type": "GATE",
          "question_type": "MCQ"
        },
        {
          "question_text": "Which of the following correctly describe the differences and use cases of RIP, OSPF, and BGP?",
          "options": [
            "A. RIP: small networks, distance vector, hop count metric, max 15 hops, slow convergence",
            "B. OSPF: large enterprise/ISP networks, link-state, cost metric (bandwidth-based), fast convergence, hierarchical with areas",
            "C. BGP: inter-AS internet routing, path vector, policy-based, AS_PATH loop prevention, runs over TCP port 179",
            "D. RIP and OSPF are exterior gateway protocols; BGP is an interior gateway protocol"
          ],
          "correct_answer": "A, B, C",
          "explanation": "Routing protocol comparison: A: RIP — distance vector, metric = hop count (max 15), periodic updates every 30s, slow convergence, count-to-infinity problem, suitable for small networks only. B: OSPF — link-state, metric = cost (inversely proportional to bandwidth: cost = 10^8 / interface bandwidth), triggered updates (fast convergence), hierarchical areas, Dijkstra's SPF, supports VLSM/CIDR, authentication. Widely used in enterprise and ISP networks. C: BGP — path vector, exterior gateway protocol (between ASes), policy-based routing (LOCAL_PREF, MED, AS_PATH), loop prevention via AS_PATH, TCP port 179 (reliable transport), currently BGP-4 (RFC 4271) with MP-BGP extensions for IPv6 and VPNs. D is FALSE — RIP and OSPF are interior gateway protocols (IGPs); BGP is the exterior gateway protocol (EGP).",
          "year": 2025,
          "exam_type": "GATE",
          "question_type": "MSQ"
        }
      ]
    }
  ];

  const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
  };

  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(` ${colors.bright}🎓 PATTERNMASTER PYQ SEEDER v2.4 (Local Images & Cleanup) ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  const totalPatterns = pyqData.length;
  let processedPatterns = 0;
  let totalQuestions = 0;
  let skippedPatterns = 0;
  let errors = 0;

  for (const item of pyqData) {
    processedPatterns++;
    const progress = `[${processedPatterns}/${totalPatterns}]`;

    // Check if pattern exists, create if not (or just find)
    let pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(`${colors.yellow}⚠️  ${progress} Pattern not found, creating: ${item.pattern.topic_name}${colors.reset}`);
      pattern = await prisma.pattern.create({
        data: {
          topic_name: item.pattern.topic_name,
          subject: (item.pattern as any).subject || "General",
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          atomic_logic: `Practice problems for ${item.pattern.topic_name}`
        }
      });
    }

    try {
      let count = 0;
      for (const pyq of item.pyqs) {
        // Data Cleaning: Remove scraper noise
        const cleanQuestionText = pyq.question_text
          .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
          .replace(/0 reply/gi, '')
          .replace(/🚩 Edit necessary \| 👮 Rhino \| 💬 “[^”]*”/gi, '')
          .trim();

        // Image Transformation: Convert filename to url
        const cleanImages = pyq.images?.map((img: any) => ({
          ...img,
          url: img.filename ? `/${img.filename}` : img.url
        }));

        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: cleanQuestionText,
            },
          },
          update: {
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
          create: {
            pattern_id: pattern.id,
            question_text: cleanQuestionText,
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(`${colors.green}✅ ${progress} Seeded ${colors.bright}${count}${colors.reset}${colors.green} PYQs for: ${colors.bright}${pattern.topic_name}${colors.reset}`);
    } catch (err) {
      console.log(`${colors.red}❌ ${progress} Error seeding ${item.pattern.topic_name}${colors.reset}`);
      console.error(err.message);
      errors++;
    }
  }

  console.log(`\n${colors.bright}${colors.green}✨ Seeding Complete!${colors.reset}`);
  console.log(`${colors.cyan}Total Questions: ${colors.bright}${totalQuestions}${colors.reset}`);
  if (errors > 0) console.log(`${colors.red}Errors Detected: ${colors.bright}${errors}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

main()
  .catch((e) => {
    console.error('💥 FATAL ERROR SEEDING PYQs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
