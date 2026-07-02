/* eslint-disable */
export const C = {
      pageBg:    "#F7FAFC",
      sidebar:   "#FFFFFF",
      card:      "#FFFFFF",
      cardHover: "#F0F4F8",
      input:     "#FFFFFF",
      border:    "#E4EAF2",
      borderMid: "#C0C9D5",
      text1:     "#222831",
      text2:     "#364152",
      text3:     "#486081",
      text4:     "#8090A6",
      text5:     "#b6c1d2",
      codeBg:    "#333b48",
      brand:     "#059669",
      brandSoft: "#e5efdb",
      brandText: "#047857",
      shadowCard:  "0 1.5px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -24px rgba(34,40,49,0.22), 0 2px 8px rgba(34,40,49,0.05)",
      shadowSm:    "0 1px 2px rgba(34,40,49,0.04)",
      shadowMd:    "0 4px 12px rgba(34,38,49,0.12)",
      evidence: {
        "very-high": { dot: "#059669", text: "#047857", surface: "#e6f4ee", label: "Very High" },
        "high":      { dot: "#0891b2", text: "#0e7490", surface: "#e0f2fe", label: "High" },
        "moderate":  { dot: "#d97706", text: "#b45309", surface: "#fef3c7", label: "Moderate" },
        "low":       { dot: "#94a3b8", text: "#64748b", surface: "#f1f5f9", label: "Low" },
      },
    };
export const DEFAULT_ADVANCED: AdvancedParams = {
      temporal:        { mode: "range" },
      demographics:    { sex: "all" },
      caseDetails:     { reporterTypes: [], seriousness: [], outcomes: [] },
      geographic:      { regions: [] },
      drugDetails:     { routes: [], concomitantDrugs: [] },
      signalDetection: { method: "PRR", prrThreshold: 2.0, minN: 3, ciLevel: 0.95 },
    };
export const AGENTS = [
      { id: "planner",  name: "Planner",         role: "Orchestration & Strategy", sides: 6, color: "#059669", desc: "Decomposes complex safety queries into executable sub-tasks", thinkingLabel: "orchestrating", generatingLabel: "synthesising",
        subAgents: [] },
      { id: "data",     name: "Data Compiler",    role: "Evidence Retrieval",       sides: 5, color: "#0891b2", desc: "Aggregates FAERS, EudraVigilance & literature sources",      thinkingLabel: "retrieving",    generatingLabel: "compiling",
        subAgents: [
          { id: "faers",      name: "FAERS Retriever (openFDA)", icon: "database", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "faers", desc: "Retrieves US FDA Adverse Event Reporting System data" },
          { id: "eudra",      name: "EudraVigilance",      icon: "globe", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "eudra", desc: "Retrieves European Medicines Agency safety data" },
          { id: "vigiaccess", name: "VigiBase",          icon: "globe", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "vigiaccess", desc: "Retrieves WHO international drug monitoring database data" },
          { id: "pubmed",     name: "PubMed Search",       icon: "book", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "pubmed", desc: "Retrieves literature citations and abstracts from MEDLINE" },
          { id: "clinicaltrials", name: "Clinical Trials", icon: "database", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "clinicaltrials", desc: "Retrieves registered study designs and outcome results" },
          { id: "europepmc",  name: "Europe PMC",          icon: "book", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "europepmc", desc: "Retrieves open-access biomedical literature abstracts and full texts" },
          { id: "biorxiv",    name: "bioRxiv Search",      icon: "book", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "biorxiv", desc: "Retrieves preprint publications in life sciences" },
          { id: "openalex",   name: "OpenAlex Search",     icon: "book", parentId: "data", origin: "builtin", status: "validated", scope: "org", capability: "openalex", desc: "Retrieves global research documents and metadata graph" },
        ]},
      { id: "medical",  name: "Medical Reviewer", role: "Clinical Validation",      sides: 4, color: "#7c3aed", desc: "Applies clinical reasoning and MedDRA classification",        thinkingLabel: "analyzing",     generatingLabel: "reviewing",
        subAgents: [
          { id: "disprop",    name: "Disproportionality",  icon: "chart", parentId: "medical", origin: "builtin", status: "validated", scope: "org", capability: "disprop", desc: "Calculates disproportionality metrics (PRR, ROR, chi2)" },
          { id: "chembl",     name: "ChEMBL Query",        icon: "molecule", parentId: "medical", origin: "builtin", status: "validated", scope: "org", capability: "chembl", desc: "Retrieves chemical structure and bioactivity data for compounds" },
          { id: "qa",         name: "QA Validator",        icon: "check", parentId: "medical", origin: "builtin", status: "validated", scope: "org", capability: "qa", desc: "Performs validation and quality checks on signals" },
          { id: "genomics_validator", name: "Genomics Validator", icon: "database", parentId: "medical", origin: "builtin", status: "validated", scope: "org", capability: "genomics_validator", desc: "Validates variants using ClinVar and gnomAD databases" },
          { id: "pathway_analyst",    name: "Pathway Analyst",    icon: "chart", parentId: "medical", origin: "builtin", status: "validated", scope: "org", capability: "pathway_analyst", desc: "Performs molecular pathway enrichment analysis" },
          { id: "molecular_profiler", name: "Molecular Profiler", icon: "molecule", parentId: "medical", origin: "builtin", status: "validated", scope: "org", capability: "molecular_profiler", desc: "Profiles molecular interactions and expression" },
        ]},
      { id: "phi",      name: "PHI Guard",        role: "Compliance & Privacy",     sides: 3, color: "#d97706", desc: "Ensures HIPAA/GDPR compliance across all outputs",            thinkingLabel: "scanning",      generatingLabel: "attesting",
        subAgents: [
          { id: "ols_normalize", name: "EBI OLS Normalization", icon: "check", parentId: "phi", origin: "builtin", status: "validated", scope: "org", capability: "ols_normalize", desc: "Normalizes terminology to OLS ontologies" }
        ] },
    ];
export const FLOWS = [
      { id: "safety",       label: "FAERS Signal Detection", icon: "⚡", desc: "Analyze adverse event reporting patterns" },
      { id: "cohort",       label: "Cohort Builder",         icon: "◎",  desc: "Define patient populations for analysis" },
      { id: "genomics",     label: "Genomics Audit",         icon: "✦",  desc: "Pharmacogenomic interaction screening" },
      { id: "benefit-risk", label: "Benefit-Risk Report",    icon: "⬡",  desc: "Compile regulatory-grade B/R assessments" },
    ];
export const MOCK_HISTORY = [
      { id: 1, title: "Metformin FAERS Q3 Analysis",     date: "2 hours ago" },
      { id: 2, title: "Oncology Cohort — Pembrolizumab", date: "Yesterday"   },
      { id: 3, title: "CYP2D6 Genomics Audit",           date: "3 days ago"  },
      { id: 4, title: "Dupixent B/R Compilation",        date: "1 week ago"  },
    ];
export const GREETINGS = [
      "Hello, Raya. What's the signal?",
      "Good to see you, Raya.",
      "What are we investigating today?",
      "Ready when you are, Raya.",
      "Which compound needs attention?",
      "Let's find the signal.",
      "What's on your safety list?",
      "Where do we start today?",
    ];
export const WELCOME_PHRASES = [
      "What drug-safety question are you investigating?",
      "Which compound needs a signal review?",
      "Ready to audit pharmacovigilance data.",
      "Let's compile a benefit-risk assessment.",
    ];
export const SIGNAL_ROWS: SignalRow[] = [
      { event: "Hepatotoxicity", prr: "3.2", ci: "2.1 – 4.8", n: 412, level: "strong",   chi2: "28.4", ror: "3.4 (2.1–4.8)" },
      { event: "Hypertension",   prr: "2.1", ci: "1.4 – 3.1", n: 287, level: "moderate", chi2: "9.1",  ror: "2.2 (1.4–3.2)" },
      { event: "GI Haemorrhage", prr: "1.6", ci: "0.9 – 2.7", n: 198, level: "weak",     chi2: "2.3",  ror: "1.6 (0.9–2.8)" },
    ];
export const ARTIFACT_QUERY = `# 1 · Pull ibuprofen ICSRs from FAERS (Q3 2024)
openfda_query search \\
  --category drug --endpoint event \\
  --search "patient.drug.medicinalproduct:ibuprofen \\
            +AND+receivedate:[20240701+TO+20240930]"

# 2 · Count adverse events by MedDRA preferred term
openfda_query count \\
  --count_field patient.reaction.reactionmeddrapt.exact \\
  --summary 10

# 3 · Disproportionality vs the full-database reference group
#        a = drug & event     b = drug & other event
#        c = ¬drug & event    d = ¬drug & other event
PRR = (a / (a + b)) / (c / (c + d))
ROR = (a * d) / (b * c)
chi2 = ((a*d - b*c)**2 * (a+b+c+d)) / ((a+b)*(c+d)*(a+c)*(b+d))

# 4 · Flag a signal (Evans criteria)
signal = (PRR >= 2) and (chi2 >= 4) and (a >= 3)`;
export const MOCK_CONVERSATIONS: Record<string, { messages: ChatMessage[]; artifact: ResultData | null }> = {
      "Metformin FAERS Q3 Analysis": {
        messages: [
          { id: 1, type: "user", text: "Analyze metformin safety signals in Q3 2024 FAERS reports, focusing on lactic acidosis and hepatotoxicity." },
          { id: 2, type: "agent", agent: "planner", text: "I'm breaking down your analysis into parallel subtasks: retrieving FAERS data, computing disproportionality statistics, conducting medical review, and ensuring PHI compliance across 3,847 reports.", component: { kind: "planning-trace" } },
          { id: 3, type: "agent", agent: "data", text: "Data compilation complete: Retrieved 3,847 metformin-related ICSRs from FAERS Q3 2024 (July–September). MedDRA v27.0 coding applied. Coverage includes US spontaneous reports and EMA VigiBase cross-references.", thought: { steps: [
            { kind: "reason", text: "Aggregated case counts by preferred term" },
            { kind: "tool", name: "clinicaltrials_query", args: [{ label: "drug", value: "metformin" }], result: "Retrieved 12 active trials for Metformin cohort", subAgent: { id: "clinicaltrials", name: "Clinical Trials", status: "done" } },
            { kind: "tool", name: "europepmc_search", args: [{ label: "query", value: "metformin lactic acidosis" }], result: "Retrieved 45 open-access publications on Metformin DILI mechanisms", subAgent: { id: "europepmc", name: "Europe PMC", status: "done" } }
          ] } },
          { id: 4, type: "agent", agent: "medical", text: "**Hepatotoxicity** emerges as the strongest signal (PRR 3.2, CI 2.1–4.8, n=412). **Lactic acidosis** shows moderate elevation (PRR 2.4, CI 1.6–3.5, n=184). Both meet Evans causality criteria. Cross-checking with ChEMBL toxicology data and published literature confirms mechanism plausibility.", thought: { steps: [{ kind: "reason", text: "Applied WHO-UMC causality assessment" }] } },
          { id: 5, type: "agent", agent: "phi", text: "PHI scan complete: Zero personal identifiers detected across 3,847 narratives. All age data reported as ranges, geographic at country-level. Output is HIPAA-compliant and ready for regulatory submission.", thought: { steps: [
            { kind: "reason", text: "De-identification verified" },
            { kind: "tool", name: "ols_normalize", args: [{ label: "ontology", value: "MedDRA" }, { label: "term", value: "Lactic acidosis" }], result: "MedDRA PT 10023647 normalized and validated via EBI OLS", subAgent: { id: "ols_normalize", name: "EBI OLS Normalization", status: "done" } }
          ] } },
          { id: 6, type: "agent", agent: "medical", component: { kind: "result-tabs", data: { answer: [{ kind: "heading", text: "Safety Summary" }, { kind: "paragraph", segs: [{ t: "text", v: "Metformin shows two clinically relevant safety signals in Q3 2024 data." }] }, { kind: "signal-table", rows: SIGNAL_ROWS }], drugs: [], signals: SIGNAL_ROWS, refs: [], suggested: ["What's the trend in hepatotoxicity over time?", "How does this compare to prior quarters?"], params: { compound: "Metformin", period: "Q3 2024", categories: ["Hepatotoxicity", "Lactic Acidosis"] }, artifactTitle: "Metformin Q3 2024", artifactQuery: ARTIFACT_QUERY } } },
        ],
        artifact: null,
      },
      "Oncology Cohort — Pembrolizumab": {
        messages: [
          { id: 1, type: "user", text: "Compile benefit-risk assessment for pembrolizumab in melanoma cohort. Include immune-related adverse events and efficacy metrics." },
          { id: 2, type: "agent", agent: "planner", text: "Setting up multi-agent pipeline to evaluate pembrolizumab immunotoxicity, efficacy outcomes, and compliance readiness across oncology registries.", component: { kind: "planning-trace" } },
          { id: 3, type: "agent", agent: "data", text: "Oncology cohort data: 1,247 melanoma patients treated with pembrolizumab (monotherapy). Follow-up duration: 6–36 months. Data sourced from Flatiron EHR and clinical trial registries.", thought: { steps: [{ kind: "reason", text: "Cross-referenced with SEER cancer database" }] } },
          { id: 4, type: "agent", agent: "medical", text: "Immune-related adverse events (irAEs) detected: Pneumonitis (8.2%), hepatitis (6.1%), thyroiditis (4.7%). Severe (Grade 3+) irAEs: 12.3% incidence. Efficacy: Overall response rate 52% (partial + complete remission).", thought: { steps: [{ kind: "reason", text: "Stratified by patient demographics" }] } },
          { id: 5, type: "agent", agent: "medical", text: "Risk stratification complete. High-risk subgroup (age >65 + prior autoimmune): 18% Grade 3+ irAE risk. Standard risk: 11%. Efficacy remains consistent across groups.", component: { kind: "result-tabs", data: { answer: [{ kind: "heading", text: "B/R Profile" }, { kind: "paragraph", segs: [{ t: "text", v: "Pembrolizumab shows favorable benefit-risk in melanoma with manageable irAE profile." }] }, { kind: "signal-table", rows: SIGNAL_ROWS }], drugs: [], signals: SIGNAL_ROWS, refs: [], suggested: ["Compare to nivolumab outcomes?", "Predictive factors for irAEs?"], params: { compound: "Pembrolizumab", period: "2022–2024", categories: ["Pneumonitis", "Hepatitis"] }, artifactTitle: "Pembrolizumab B/R", artifactQuery: ARTIFACT_QUERY } } },
        ],
        artifact: null,
      },
      "CYP2D6 Genomics Audit": {
        messages: [
          { id: 1, type: "user", text: "Audit CYP2D6 metabolizer phenotype distribution in codeine adverse event reporters. Identify ultra-rapid metabolizers at overdose risk." },
          { id: 2, type: "agent", agent: "planner", text: "Launching genomic analysis: linking CYP2D6 genotypes to codeine-related hospitalizations in pharmacogenomics databases.", component: { kind: "planning-trace" } },
          { id: 3, type: "agent", agent: "data", text: "CYP2D6 genotype distribution retrieved from 412 codeine adverse event cases: Ultra-rapid metabolizers (duplication/multiplications): 8.5%, Normal metabolizers: 64.2%, Intermediate: 18.1%, Poor metabolizers: 9.2%.", thought: { steps: [
            { kind: "reason", text: "Queried CPIC and PharmGKB databases" },
            { kind: "tool", name: "ensembl_lookup", args: [{ label: "gene", value: "CYP2D6" }], result: "Retrieved gene coordinates chr22:42126499-42130865, 8 transcripts identified", subAgent: { id: "genomics_validator", name: "Genomics Validator", status: "done" } }
          ] } },
          { id: 4, type: "agent", agent: "medical", text: "Ultra-rapid metabolizers show 3.8× higher risk of codeine toxicity (respiratory depression, overdose events). Clinical recommendation: CYP2D6 testing before codeine dispensing, especially in pediatric populations.", thought: { steps: [
            { kind: "reason", text: "Applied FDA pharmacogenomics guidance" },
            { kind: "tool", name: "clinvar_query", args: [{ label: "gene", value: "CYP2D6" }, { label: "variant", value: "rs12248560" }], result: "ClinVar: *17 allele classified as Normal/Decreased Function; *4 allele as Non-functional", subAgent: { id: "genomics_validator", name: "Genomics Validator", status: "done" } },
            { kind: "tool", name: "gnomad_query", args: [{ label: "gene", value: "CYP2D6" }], result: "gnomAD population frequencies: duplication/multiplication alleles range from 1% to 10% by ancestry", subAgent: { id: "genomics_validator", name: "Genomics Validator", status: "done" } },
            { kind: "tool", name: "reactome_pathways", args: [{ label: "pathway", value: "Codeine metabolism" }], result: "Reactome: CYP2D6 catalyzes O-demethylation of codeine to morphine", subAgent: { id: "pathway_analyst", name: "Pathway Analyst", status: "done" } },
            { kind: "tool", name: "pubchem_query", args: [{ label: "compound", value: "codeine" }], result: "PubChem CID 5284371: drug binds mu-opioid receptor after bioactivation to morphine", subAgent: { id: "molecular_profiler", name: "Molecular Profiler", status: "done" } }
          ] } },
          { id: 5, type: "agent", agent: "medical", component: { kind: "result-tabs", data: { answer: [{ kind: "heading", text: "Audit Result" }, { kind: "paragraph", segs: [{ t: "text", v: "CYP2D6 ultra-rapid metabolizers require dose adjustment or alternative analgesics." }] }, { kind: "signal-table", rows: SIGNAL_ROWS }], drugs: [], signals: SIGNAL_ROWS, refs: [], suggested: ["Recommend labeling change?", "Pediatric dosing guidance?"], params: { compound: "Codeine", period: "All", categories: ["CYP2D6"] }, artifactTitle: "CYP2D6 Audit", artifactQuery: ARTIFACT_QUERY } } },
        ],
        artifact: null,
      },
      "Dupixent B/R Compilation": {
        messages: [
          { id: 1, type: "user", text: "Generate a benefit-risk profile for Dupixent (dupilumab) in adult atopic dermatitis, focusing on reports of conjunctivitis and facial redness." },
          { id: 2, type: "agent", agent: "planner", text: "Initiating multi-agent safety evaluation for Dupixent: aggregating FAERS case reports, auditing disproportionality indexes, and conducting clinical causality review.", component: { kind: "planning-trace" } },
          { id: 3, type: "agent", agent: "data", text: "Evidence compiled: Aggregated 4,128 adverse event reports for Dupixent from FAERS (Q1 2021 – Q2 2024). Signal detection cohort shows conjunctivitis (n=854) and facial dermatitis (n=312) as key safety issues.", thought: { steps: [
            { kind: "reason", text: "Cross-referenced with EudraVigilance database" },
            { kind: "tool", name: "clinicaltrials_query", args: [{ label: "drug", value: "dupilumab" }], result: "Found 8 pediatric atopic dermatitis trials with ocular events", subAgent: { id: "clinicaltrials", name: "Clinical Trials", status: "done" } },
            { kind: "tool", name: "europepmc_search", args: [{ label: "query", value: "dupilumab conjunctivitis mechanism" }], result: "Retrieved 18 literature reviews on IL-4/IL-13 ocular pathways", subAgent: { id: "europepmc", name: "Europe PMC", status: "done" } }
          ] } },
          { id: 4, type: "agent", agent: "medical", text: "**Conjunctivitis** shows a very high disproportionality signal (PRR 4.1, CI 3.1–5.4). **Facial dermatitis/redness** shows moderate disproportionality (PRR 2.3, CI 1.7–3.1). Literature confirms Dupixent (dupilumab) inhibition of IL-4/IL-13 downregulates goblet cell mucin, explaining conjunctival irritation.", thought: { steps: [{ kind: "reason", text: "Evaluated biological plausibility of IL-4/13 inhibition pathway" }] } },
          { id: 5, type: "agent", agent: "phi", text: "PHI guard cleared: 4,128 narratives analyzed. Patient identifiers redacted, age/gender distributions aggregated at cohort-level. HIPAA/GDPR validation successful.", thought: { steps: [
            { kind: "reason", text: "Scanned for patient initials and dates of birth" },
            { kind: "tool", name: "ols_normalize", args: [{ label: "ontology", value: "MedDRA" }, { label: "term", value: "Conjunctivitis" }], result: "MedDRA PT 10010741 mapped via OLS; HIPAA Safe Harbor validation successful", subAgent: { id: "ols_normalize", name: "EBI OLS Normalization", status: "done" } }
          ] } },
          { id: 6, type: "agent", agent: "medical", component: { kind: "result-tabs", data: {
            answer: [
              { kind: "heading", text: "Dupixent Benefit-Risk Assessment" },
              { kind: "paragraph", segs: [{ t: "text", v: "Dupixent demonstrates a favorable overall benefit-risk profile, though post-marketing data confirms elevated disproportionality for ocular and facial inflammatory events." }] },
              { kind: "signal-table", rows: SIGNAL_ROWS },
            ],
            drugs: [], signals: SIGNAL_ROWS, refs: [],
            suggested: ["Are conjunctivitis rates dose-dependent?", "Review pediatric cohort safety?"],
            params: { compound: "Dupixent", period: "Q1 2021 – Q2 2024", categories: ["Conjunctivitis", "Facial Dermatitis"] },
            artifactTitle: "Dupixent Safety Profile", artifactQuery: ARTIFACT_QUERY,
          } } },
        ],
        artifact: null,
      },
      "Pembrolizumab — Weekly": {
        messages: [
          { id: 1, type: "user", text: "Start weekly safety surveillance for Pembrolizumab." },
          { id: 2, type: "agent", agent: "planner", text: "Surveillance pipeline configured for Pembrolizumab. Standard frequency: Weekly. Focus areas: Immunotoxicity, Pneumonitis, Hepatitis, Myocarditis.", locked: true },
          { id: 3, type: "agent", agent: "planner", text: "Weekly run · 2026-06-13 — 5 signals, 2 new. These reports have also been sent to your email with all the necessary details.",
            component: {
              kind: "result-tabs",
              data: {
                answer: [
                  { kind: "heading", text: "Weekly Safety Surveillance Report" },
                  { kind: "paragraph", segs: [{ t: "text", v: "Safety surveillance run completed for Pembrolizumab. Five active signals detected, including two new disproportionality alerts." }] }
                ],
                // TODO(ds): replace with DS token for Pembrolizumab drug data
                drugs: [{
                  name: "Pembrolizumab", className: "PD-1 inhibitor · Immune checkpoint inhibitor",
                  refIndices: [7, 8, 9, 10],
                  tabs: {
                    Overview: [
                      { label: "Mechanism of Action", body: "Humanized monoclonal IgG4 antibody that binds to PD-1 receptor on T cells, blocking interaction with PD-L1 and PD-L2 and restoring anti-tumor immune response." },
                      { label: "Indications", body: "Melanoma (unresectable/metastatic), NSCLC (first-line, PD-L1 ≥50%), Head and Neck SCC, Hodgkin Lymphoma, Urothelial Carcinoma, MSI-H/dMMR solid tumors." },
                      { label: "Pharmacokinetics", body: "IV administration; half-life ~22 days. Clearance increases with body weight. Minimal renal clearance; hepatic metabolism not a major pathway." },
                    ],
                    Dosing: [
                      { label: "Adult — Standard", body: "200 mg IV every 3 weeks OR 400 mg IV every 6 weeks.\nAdministered as IV infusion over 30 minutes.\nContinue until disease progression or unacceptable toxicity." },
                      { label: "Renal / Hepatic Impairment", body: "No dose adjustment required for mild-to-moderate renal or hepatic impairment. Not studied in severe impairment." },
                    ],
                    Safety: [
                      { label: "Immune-Mediated Adverse Events (irAEs)", body: "Pneumonitis (3-8%), hepatitis (2-6%), colitis (1-3%), myocarditis (0.5-1%), thyroiditis (8-15%), adrenal insufficiency (0.5-2%), and dermatitis (10-20%). Severe (Grade 3+) irAEs occur in 10-15% of patients. Most manageable with corticosteroids and dose interruption." },
                      { label: "Myocarditis (Boxed Warning)", body: "Immune-mediated myocarditis can be fatal. Disproportionality signal observed (PRR 4.1, n=5). Monitor for chest pain, dyspnoea, arrhythmia. Manage with high-dose corticosteroids and withhold pembrolizumab." },
                      { label: "Contraindications", body: "Known hypersensitivity to pembrolizumab or excipients. History of severe infusion reactions." },
                    ],
                    Clinical: [
                      { label: "Monitoring", body: "Baseline LFTs, thyroid function, and pulmonary function tests. Monitor for symptoms of irAEs throughout treatment. Periodic imaging for pneumonitis and hepatitis surveillance." },
                      { label: "Key Interactions", body: "Systemic corticosteroids (may reduce efficacy if used before treatment). No known CYP-mediated drug-drug interactions due to monoclonal antibody clearance pathway." },
                    ],
                  },
                }],
                signals: [
                  { event: "Myocarditis", prr: "4.1", ci: "2.8 – 5.9", n: 5, level: "strong", chi2: "12.4", ror: "4.2" },
                  { event: "Pneumonitis", prr: "3.5", ci: "2.3 – 5.1", n: 18, level: "strong", chi2: "18.2", ror: "3.6" },
                  { event: "Hepatitis", prr: "2.8", ci: "1.7 – 4.2", n: 12, level: "moderate", chi2: "9.6", ror: "2.9" },
                  { event: "Colitis", prr: "2.2", ci: "1.2 – 3.8", n: 8, level: "moderate", chi2: "5.1", ror: "2.3" },
                  { event: "Nephritis", prr: "2.4", ci: "1.4 – 3.9", n: 8, level: "moderate", chi2: "6.2", ror: "2.5" }
                ],
                // TODO(ds): replace with DS token for Pembrolizumab reference data
                refs: [
                  { n: 7, title: "Pembrolizumab Immune-Related Adverse Events: A Systematic Review and Meta-Analysis", journal: "JAMA Oncology", authors: "Johnson DB, Reynolds KL, Sullivan RJ", year: 2023, evidenceStrength: "very-high", studyType: "Systematic Review", evidenceSnapshot: { summary: "Meta-analysis of 107 clinical trials characterizing irAE incidence. Myocarditis (0.8%), pneumonitis (5.2%), hepatitis (3.4%) confirmed as key safety signals.", studyDesign: "Systematic meta-analysis of clinical trials and observational cohorts", population: "Advanced malignancy patients treated with pembrolizumab (N = 24,847)" } },
                  { n: 8, title: "PD-1 Inhibitor Myocarditis: Mechanisms and Clinical Presentation", journal: "Nature Reviews Cardiology", authors: "Moslehi JJ, Salem JE, Sosman JA", year: 2022, evidenceStrength: "very-high", studyType: "Review", evidenceSnapshot: { summary: "Comprehensive review of ICI myocarditis describing T-cell-mediated cardiomyocyte infiltration as the primary mechanism. Incidence 0.5-1.0% with 50% fatality in severe cases.", studyDesign: "Narrative review with case series", population: "ICI-treated patients with confirmed myocarditis (N = 312)" } },
                  { n: 9, title: "Pembrolizumab Safety in Real-World Oncology Cohorts: FAERS Disproportionality Analysis 2018-2024", journal: "Drug Safety", authors: "Patel V, Zhang Y, Lee C", year: 2024, evidenceStrength: "high", studyType: "Cohort Study", evidenceSnapshot: { summary: "FAERS disproportionality analysis of pembrolizumab adverse events. Pneumonitis (PRR 3.5), myocarditis (PRR 4.1), hepatitis (PRR 2.8) consistently above threshold.", studyDesign: "Retrospective pharmacovigilance cohort", population: "FAERS reports with pembrolizumab as primary suspect (N = 42,108 reports)" } },
                  { n: 10, title: "Management of irAEs in Patients Treated with Immune Checkpoint Inhibitors: ASCO Guideline Update", journal: "Journal of Clinical Oncology", authors: "Brahmer JR, Lacchetti C, Schneider BJ", year: 2023, evidenceStrength: "very-high", studyType: "Guideline", evidenceSnapshot: { summary: "Updated ASCO clinical practice guideline for irAE management including corticosteroid protocols for Grade 2-4 pneumonitis, hepatitis, and myocarditis.", studyDesign: "Clinical practice guideline", population: "Patients receiving immune checkpoint inhibitors across all approved indications" } },
                ],
                suggested: ["Why did myocarditis jump?", "Compare to last week's run", "Are any signals above the PRR 3.0 threshold?", "What are the data sources?"],
                params: { compound: "Pembrolizumab", period: "Weekly Run - 2026-06-13", categories: ["Myocarditis", "Pneumonitis"], isSurveillance: true, reportId: "COMP-2026-005" },
                artifactTitle: "Pembrolizumab Weekly Run",
                artifactQuery: ""
              }
            },
            locked: true
          }
        ],
        artifact: null
      },
      "Atorvastatin — Monthly": {
        messages: [
          { id: 1, type: "user", text: "Start monthly safety surveillance for Atorvastatin." },
          { id: 2, type: "agent", agent: "planner", text: "Surveillance pipeline configured for Atorvastatin. Standard frequency: Monthly. Focus areas: Myalgia, Transaminase Elevation.", locked: true },
          { id: 3, type: "agent", agent: "planner", text: "Monthly run · 2026-06-01 — 2 signals, 0 new. These reports have also been sent to your email with all the necessary details.",
            component: {
              kind: "result-tabs",
              data: {
                answer: [
                  { kind: "heading", text: "Monthly Safety Surveillance Report" },
                  { kind: "paragraph", segs: [{ t: "text", v: "Safety surveillance run completed for Atorvastatin. No new disproportionality signals or PRR threshold violations were detected." }] }
                ],
                // TODO(ds): replace with DS token for Atorvastatin drug data
                drugs: [{
                  name: "Atorvastatin", className: "Statin · HMG-CoA reductase inhibitor",
                  refIndices: [11, 12],
                  tabs: {
                    Overview: [
                      { label: "Mechanism of Action", body: "Competitive inhibitor of HMG-CoA reductase, the rate-limiting enzyme in cholesterol biosynthesis. Reduces LDL-C, triglycerides, and modestly increases HDL-C." },
                      { label: "Indications", body: "Primary hypercholesterolemia, mixed dyslipidemia, heterozygous familial hypercholesterolemia, cardiovascular disease prevention." },
                      { label: "Pharmacokinetics", body: "Oral administration; peak plasma 1-2 h. ~98% protein-bound. Hepatic metabolism via CYP3A4. Half-life ~14 h; active metabolites extend PD effect." },
                    ],
                    Dosing: [
                      { label: "Adult — Standard", body: "Initial: 10-20 mg once daily.\nTitrated up to 80 mg once daily based on LDL-C goals.\nMay be administered at any time of day with or without food." },
                      { label: "Renal / Hepatic Impairment", body: "No dose adjustment for renal impairment. Contraindicated in active liver disease or unexplained persistent transaminase elevations." },
                    ],
                    Safety: [
                      { label: "Boxed Warning", body: "Increased risk of new-onset diabetes (HbA1c and fasting glucose increases). Rare cases of rhabdomyolysis with renal failure secondary to myoglobinuria." },
                      { label: "Myalgia", body: "Myalgia reported in 1-5% of patients. Disproportionality signal: PRR 1.8 (weak). Risk increased with higher doses, advanced age, and drug interactions (CYP3A4 inhibitors)." },
                      { label: "Contraindications", body: "Active liver disease; unexplained persistent hepatic transaminase elevations; pregnancy and lactation; concomitant cyclosporine." },
                    ],
                    Clinical: [
                      { label: "Monitoring", body: "Baseline LFTs and CPK levels. Recheck LFTs 12 weeks after initiation and periodically thereafter. Monitor for muscle symptoms." },
                      { label: "Key Interactions", body: "CYP3A4 inhibitors (azole antifungals, macrolides, grapefruit juice) increase atorvastatin levels and myopathy risk. Warfarin increases INR." },
                    ],
                  },
                }],
                signals: [
                  { event: "Myalgia", prr: "1.8", ci: "1.1 – 2.9", n: 120, level: "weak", chi2: "3.2", ror: "1.8" },
                  { event: "Mild Transaminase Elevation", prr: "1.4", ci: "0.8 – 2.3", n: 45, level: "weak", chi2: "2.1", ror: "1.4" }
                ],
                // TODO(ds): replace with DS token for Atorvastatin reference data
                refs: [
                  { n: 11, title: "Statin-Associated Muscle Symptoms: Incidence and Risk Factors in a Large Real-World Cohort", journal: "JAMA Internal Medicine", authors: "Thompson PD, Clarkson PM, Rosenson RS", year: 2023, evidenceStrength: "high", studyType: "Cohort Study", evidenceSnapshot: { summary: "Large cohort study of 104,000 statin users. Myalgia incidence 5-10% with atorvastatin, dose-dependent. Disproportionality highest in patients ≥65 years and those on CYP3A4 inhibitors.", studyDesign: "Retrospective cohort using electronic health records", population: "Adults with ≥1 statin prescription (N = 104,000)" } },
                  { n: 12, title: "Atorvastatin Hepatotoxicity: A Systematic Review of Post-Marketing Surveillance Data", journal: "Hepatology", authors: "Chen M, Suzuki A, Borlak J", year: 2022, evidenceStrength: "high", studyType: "Systematic Review", evidenceSnapshot: { summary: "Systematic review confirming mild transaminase elevation as the most common hepatic finding with atorvastatin. ALT >3× ULN in ~1.5% of patients. Dose-dependent effect.", studyDesign: "Systematic review of post-marketing data and clinical trials", population: "Patients on atorvastatin across 47 studies (N = 72,000)" } },
                ],
                suggested: ["Were there any new signal alerts?", "What are the stable background signals?", "When is the next scheduled run?"],
                params: { compound: "Atorvastatin", period: "Monthly Run - 2026-06-01", categories: ["Myalgia"], isSurveillance: true, reportId: "COMP-2026-006", isSigned: true },
                artifactTitle: "Atorvastatin Monthly Run",
                artifactQuery: ""
              }
            },
            locked: true
          }
        ],
        artifact: null
      }
    };
export const REFERENCES: Reference[] = [
      {
        n: 1,
        title: "Hepatotoxicity Risk with NSAIDs: A Systematic Meta-Analysis of Disproportionality Signals",
        journal: "Journal of Hepatology", authors: "Smith A, Patel R, Chen W", year: 2023,
        evidenceStrength: "very-high", studyType: "Systematic Review",
        evidenceSnapshot: {
          summary: "Meta-analysis of 42 RCTs and 18 observational cohorts demonstrated a consistent hepatotoxicity disproportionality signal for ibuprofen across FAERS and EudraVigilance databases, with PRR values exceeding the threshold of 2.0 in patients with pre-existing hepatic conditions.",
          studyDesign: "Systematic meta-analysis of pharmacovigilance databases",
          population: "Adults ≥18 with ≥3 months NSAID exposure (N = 847,234)",
        },
      },
      {
        n: 2,
        title: "Ibuprofen Cardiovascular Safety Profile: Real-World Evidence from FAERS 2019–2024",
        journal: "Circulation: Cardiovascular Quality and Outcomes", authors: "Nissen SE, Walker J, Kaur M", year: 2022,
        evidenceStrength: "high", studyType: "Cohort Study",
        evidenceSnapshot: {
          summary: "Retrospective cohort of 2.1M NSAID users found a 2.1-fold increase in hypertension adverse events in ibuprofen users vs. the reference NSAID population, particularly in patients ≥65 years.",
          studyDesign: "Retrospective observational cohort",
          population: "Adults with ≥1 ibuprofen prescription 2019–2024 (N = 2,147,892)",
        },
      },
      {
        n: 3,
        title: "MedDRA Classification of NSAID Hepatic Adverse Events: A Harmonization Review",
        journal: "Drug Safety", authors: "Johansson E, Torres C, Kim S", year: 2023,
        evidenceStrength: "high", studyType: "Guideline",
      },
      {
        n: 4,
        title: "Signal Detection Methodology in FAERS: PRR vs Bayesian Confidence Propagation",
        journal: "Pharmacoepidemiology and Drug Safety", authors: "Brown T, Martinez F, Liu Z", year: 2022,
        evidenceStrength: "moderate", studyType: "Systematic Review",
      },
      {
        n: 5,
        title: "GI Haemorrhage Risk with NSAIDs: A Population-Based Study",
        journal: "Gastroenterology", authors: "Davis R, Sharma P", year: 2021,
        evidenceStrength: "moderate", studyType: "Cohort Study",
        evidenceSnapshot: {
          summary: "Population-based study confirming GI haemorrhage as a known NSAID class effect, with ibuprofen showing lower absolute risk than diclofenac but elevated vs celecoxib at comparable doses.",
          studyDesign: "Population-based cohort using GP records",
          population: "UK adults prescribed NSAIDs 2015–2020 (N = 312,000)",
        },
      },
      {
        n: 6,
        title: "ICH E2E Pharmacovigilance Planning: Signal Detection Thresholds and Contextualization",
        journal: "International Journal of Clinical Pharmacology", authors: "WHO Safety Surveillance Committee", year: 2020,
        evidenceStrength: "very-high", studyType: "Guideline",
      },
      // TODO(ds): replace with DS token for Pembrolizumab reference data
      {
        n: 7,
        title: "Pembrolizumab Immune-Related Adverse Events: A Systematic Review and Meta-Analysis",
        journal: "JAMA Oncology", authors: "Johnson DB, Reynolds KL, Sullivan RJ", year: 2023,
        evidenceStrength: "very-high", studyType: "Systematic Review",
        evidenceSnapshot: {
          summary: "Meta-analysis of 107 clinical trials characterizing irAE incidence. Myocarditis (0.8%), pneumonitis (5.2%), hepatitis (3.4%) confirmed as key safety signals.",
          studyDesign: "Systematic meta-analysis of clinical trials and observational cohorts",
          population: "Advanced malignancy patients treated with pembrolizumab (N = 24,847)",
        },
      },
      {
        n: 8,
        title: "PD-1 Inhibitor Myocarditis: Mechanisms and Clinical Presentation",
        journal: "Nature Reviews Cardiology", authors: "Moslehi JJ, Salem JE, Sosman JA", year: 2022,
        evidenceStrength: "very-high", studyType: "Review",
        evidenceSnapshot: {
          summary: "Comprehensive review of ICI myocarditis describing T-cell-mediated cardiomyocyte infiltration as the primary mechanism. Incidence 0.5-1.0% with 50% fatality in severe cases.",
          studyDesign: "Narrative review with case series",
          population: "ICI-treated patients with confirmed myocarditis (N = 312)",
        },
      },
      {
        n: 9,
        title: "Pembrolizumab Safety in Real-World Oncology Cohorts: FAERS Disproportionality Analysis 2018-2024",
        journal: "Drug Safety", authors: "Patel V, Zhang Y, Lee C", year: 2024,
        evidenceStrength: "high", studyType: "Cohort Study",
        evidenceSnapshot: {
          summary: "FAERS disproportionality analysis of pembrolizumab adverse events. Pneumonitis (PRR 3.5), myocarditis (PRR 4.1), hepatitis (PRR 2.8) consistently above threshold.",
          studyDesign: "Retrospective pharmacovigilance cohort",
          population: "FAERS reports with pembrolizumab as primary suspect (N = 42,108 reports)",
        },
      },
      {
        n: 10,
        title: "Management of irAEs in Patients Treated with Immune Checkpoint Inhibitors: ASCO Guideline Update",
        journal: "Journal of Clinical Oncology", authors: "Brahmer JR, Lacchetti C, Schneider BJ", year: 2023,
        evidenceStrength: "very-high", studyType: "Guideline",
        evidenceSnapshot: {
          summary: "Updated ASCO clinical practice guideline for irAE management including corticosteroid protocols for Grade 2-4 pneumonitis, hepatitis, and myocarditis.",
          studyDesign: "Clinical practice guideline",
          population: "Patients receiving immune checkpoint inhibitors across all approved indications",
        },
      },
      // TODO(ds): replace with DS token for Atorvastatin reference data
      {
        n: 11,
        title: "Statin-Associated Muscle Symptoms: Incidence and Risk Factors in a Large Real-World Cohort",
        journal: "JAMA Internal Medicine", authors: "Thompson PD, Clarkson PM, Rosenson RS", year: 2023,
        evidenceStrength: "high", studyType: "Cohort Study",
        evidenceSnapshot: {
          summary: "Large cohort study of 104,000 statin users. Myalgia incidence 5-10% with atorvastatin, dose-dependent. Disproportionality highest in patients ≥65 years and those on CYP3A4 inhibitors.",
          studyDesign: "Retrospective cohort using electronic health records",
          population: "Adults with ≥1 statin prescription (N = 104,000)",
        },
      },
      {
        n: 12,
        title: "Atorvastatin Hepatotoxicity: A Systematic Review of Post-Marketing Surveillance Data",
        journal: "Hepatology", authors: "Chen M, Suzuki A, Borlak J", year: 2022,
        evidenceStrength: "high", studyType: "Systematic Review",
        evidenceSnapshot: {
          summary: "Systematic review confirming mild transaminase elevation as the most common hepatic finding with atorvastatin. ALT >3× ULN in ~1.5% of patients. Dose-dependent effect.",
          studyDesign: "Systematic review of post-marketing data and clinical trials",
          population: "Patients on atorvastatin across 47 studies (N = 72,000)",
        },
      },
    ];
export const ANSWER_BLOCKS: AnswerBlock[] = [
      { kind: "heading", text: "Summary of Findings" },
      {
        kind: "paragraph",
        segs: [
          { t: "text", v: "Disproportionality analysis of FAERS Q3 2024 reporting identified a " },
          { t: "bold", v: "strong hepatotoxicity signal" },
          { t: "text", v: " for ibuprofen (PRR 3.2, 95% CI 2.1–4.8)" },
          { t: "cite", ref: 1, strength: "very-high" },
          { t: "text", v: ", consistent with the known NSAID hepatic class effect. A moderate hypertension signal was also observed, concentrated in patients ≥65 years" },
          { t: "cite", ref: 2, strength: "high" },
          { t: "text", v: ". GI haemorrhage did not reach the disproportionality threshold in this period." },
        ],
      },
      { kind: "heading", text: "Key Signals" },
      {
        kind: "bullets",
        items: [
          [
            { t: "bold", v: "Hepatotoxicity — " },
            { t: "text", v: "412 reports, PRR 3.2. Signal exceeds the ICH E2E threshold of 2.0 and is reinforced by meta-analytic evidence across FAERS and EudraVigilance" },
            { t: "cite", ref: 1, strength: "very-high" },
            { t: "cite", ref: 6, strength: "very-high" },
            { t: "text", v: "." },
          ],
          [
            { t: "bold", v: "Hypertension — " },
            { t: "text", v: "287 reports, PRR 2.1. Real-world cohort data supports a 2.1-fold increase, most pronounced in older adults" },
            { t: "cite", ref: 2, strength: "high" },
            { t: "text", v: "." },
          ],
          [
            { t: "bold", v: "GI haemorrhage — " },
            { t: "text", v: "198 reports, PRR 1.6 (CI crosses 1.0). A known class effect but not a disproportionate signal this quarter" },
            { t: "cite", ref: 5, strength: "moderate" },
            { t: "text", v: "." },
          ],
        ],
      },
      { kind: "signal-table", rows: [] }, // rows injected from data at render
      {
        kind: "callout",
        segs: [
          { t: "text", v: "The hepatotoxicity signal warrants prioritised review. PRR exceeds 3.0 with a confidence interval well clear of unity, and the signal aligns with high-quality external evidence" },
          { t: "cite", ref: 1, strength: "very-high" },
          { t: "text", v: "." },
        ],
      },
      { kind: "heading", text: "Recommended Follow-up Workup" },
      {
        kind: "table",
        headers: ["Action", "Rationale", "Evidence"],
        rows: [
          [
            [{ t: "text", v: "Stratify hepatic reports by baseline liver disease" }],
            [{ t: "text", v: "Meta-analysis shows signal concentrates in pre-existing hepatic impairment" }],
            [{ t: "cite", ref: 1, strength: "very-high" }],
          ],
          [
            [{ t: "text", v: "Sub-analyse hypertension reports by age ≥65" }],
            [{ t: "text", v: "Cohort evidence localises risk to older adults" }],
            [{ t: "cite", ref: 2, strength: "high" }],
          ],
          [
            [{ t: "text", v: "Confirm PRR with Bayesian (BCPNN) re-estimation" }],
            [{ t: "text", v: "Reduces small-count instability in disproportionality" }],
            [{ t: "cite", ref: 4, strength: "moderate" }],
          ],
        ],
      },
      { kind: "divider" },
      {
        kind: "paragraph",
        segs: [
          { t: "em", v: "Methodology: " },
          { t: "text", v: "PRR computed per ICH E2E guidance with a signal threshold of PRR ≥ 2.0 and n ≥ 3 reports" },
          { t: "cite", ref: 6, strength: "very-high" },
          { t: "text", v: ". MedDRA preferred-term mapping applied per the NSAID harmonisation review" },
          { t: "cite", ref: 3, strength: "high" },
          { t: "text", v: "." },
        ],
      },
    ];
export const DRUGS: DrugInfo[] = [
      {
        name: "Ibuprofen", className: "NSAID · Propionic acid derivative",
        refIndices: [1, 2, 3, 5],
        tabs: {
          Overview: [
            { label: "Mechanism of Action", body: "Non-selective inhibitor of cyclooxygenase (COX-1 and COX-2), reducing prostaglandin synthesis. Anti-inflammatory, analgesic, and antipyretic effects derive from peripheral and central prostaglandin suppression." },
            { label: "Indications", body: "Mild-to-moderate pain, fever, dysmenorrhoea, osteoarthritis, and rheumatoid arthritis. Available OTC and by prescription." },
            { label: "Pharmacokinetics", body: "Rapid GI absorption; peak plasma 1–2 h. ~99% protein-bound. Hepatic metabolism via CYP2C9. Half-life ~2 h." },
          ],
          Dosing: [
            { label: "Adult — Analgesia / Antipyresis", body: "200–400 mg PO every 4–6 h as needed.\nMaximum OTC dose: 1,200 mg/day.\nMaximum prescription dose: 3,200 mg/day in divided doses." },
            { label: "Renal / Hepatic Impairment", body: "Use lowest effective dose for shortest duration. Avoid in severe hepatic impairment and advanced renal disease (CrCl < 30 mL/min)." },
          ],
          Safety: [
            { label: "Boxed Warning", body: "Increased risk of serious cardiovascular thrombotic events and serious GI bleeding, ulceration, and perforation — risk rises with dose and duration." },
            { label: "Hepatic", body: "Elevated transaminases and rare serious hepatic reactions reported; risk elevated with pre-existing liver disease. Disproportionality signal observed in FAERS Q3 2024." },
            { label: "Contraindications", body: "CABG perioperative period; known hypersensitivity; active GI bleeding; third-trimester pregnancy." },
          ],
          Clinical: [
            { label: "Monitoring", body: "Periodic LFTs and renal function on chronic use; blood pressure in hypertensive or elderly patients; CBC for occult bleeding." },
            { label: "Key Interactions", body: "Anticoagulants (bleeding risk), ACE inhibitors / ARBs (reduced effect, renal risk), aspirin (antiplatelet interference), lithium and methotrexate (raised levels)." },
          ],
        },
      },
      // TODO(ds): replace with DS token for Pembrolizumab drug data
      {
        name: "Pembrolizumab", className: "PD-1 inhibitor · Immune checkpoint inhibitor",
        refIndices: [7, 8, 9, 10],
        tabs: {
          Overview: [
            { label: "Mechanism of Action", body: "Humanized monoclonal IgG4 antibody that binds to PD-1 receptor on T cells, blocking interaction with PD-L1 and PD-L2 and restoring anti-tumor immune response." },
            { label: "Indications", body: "Melanoma (unresectable/metastatic), NSCLC (first-line, PD-L1 ≥50%), Head and Neck SCC, Hodgkin Lymphoma, Urothelial Carcinoma, MSI-H/dMMR solid tumors." },
            { label: "Pharmacokinetics", body: "IV administration; half-life ~22 days. Clearance increases with body weight. Minimal renal clearance; hepatic metabolism not a major pathway." },
          ],
          Dosing: [
            { label: "Adult — Standard", body: "200 mg IV every 3 weeks OR 400 mg IV every 6 weeks.\nAdministered as IV infusion over 30 minutes.\nContinue until disease progression or unacceptable toxicity." },
            { label: "Renal / Hepatic Impairment", body: "No dose adjustment required for mild-to-moderate renal or hepatic impairment. Not studied in severe impairment." },
          ],
          Safety: [
            { label: "Immune-Mediated Adverse Events (irAEs)", body: "Pneumonitis (3-8%), hepatitis (2-6%), colitis (1-3%), myocarditis (0.5-1%), thyroiditis (8-15%), adrenal insufficiency (0.5-2%), and dermatitis (10-20%). Severe (Grade 3+) irAEs occur in 10-15% of patients. Most manageable with corticosteroids and dose interruption." },
            { label: "Myocarditis (Boxed Warning)", body: "Immune-mediated myocarditis can be fatal. Disproportionality signal observed (PRR 4.1, n=5). Monitor for chest pain, dyspnoea, arrhythmia. Manage with high-dose corticosteroids and withhold pembrolizumab." },
            { label: "Contraindications", body: "Known hypersensitivity to pembrolizumab or excipients. History of severe infusion reactions." },
          ],
          Clinical: [
            { label: "Monitoring", body: "Baseline LFTs, thyroid function, and pulmonary function tests. Monitor for symptoms of irAEs throughout treatment. Periodic imaging for pneumonitis and hepatitis surveillance." },
            { label: "Key Interactions", body: "Systemic corticosteroids (may reduce efficacy if used before treatment). No known CYP-mediated drug-drug interactions due to monoclonal antibody clearance pathway." },
          ],
        },
      },
      // TODO(ds): replace with DS token for Atorvastatin drug data
      {
        name: "Atorvastatin", className: "Statin · HMG-CoA reductase inhibitor",
        refIndices: [11, 12],
        tabs: {
          Overview: [
            { label: "Mechanism of Action", body: "Competitive inhibitor of HMG-CoA reductase, the rate-limiting enzyme in cholesterol biosynthesis. Reduces LDL-C, triglycerides, and modestly increases HDL-C." },
            { label: "Indications", body: "Primary hypercholesterolemia, mixed dyslipidemia, heterozygous familial hypercholesterolemia, cardiovascular disease prevention." },
            { label: "Pharmacokinetics", body: "Oral administration; peak plasma 1-2 h. ~98% protein-bound. Hepatic metabolism via CYP3A4. Half-life ~14 h; active metabolites extend PD effect." },
          ],
          Dosing: [
            { label: "Adult — Standard", body: "Initial: 10-20 mg once daily.\nTitrated up to 80 mg once daily based on LDL-C goals.\nMay be administered at any time of day with or without food." },
            { label: "Renal / Hepatic Impairment", body: "No dose adjustment for renal impairment. Contraindicated in active liver disease or unexplained persistent transaminase elevations." },
          ],
          Safety: [
            { label: "Boxed Warning", body: "Increased risk of new-onset diabetes (HbA1c and fasting glucose increases). Rare cases of rhabdomyolysis with renal failure secondary to myoglobinuria." },
            { label: "Myalgia", body: "Myalgia reported in 1-5% of patients. Disproportionality signal: PRR 1.8 (weak). Risk increased with higher doses, advanced age, and drug interactions (CYP3A4 inhibitors)." },
            { label: "Contraindications", body: "Active liver disease; unexplained persistent hepatic transaminase elevations; pregnancy and lactation; concomitant cyclosporine." },
          ],
          Clinical: [
            { label: "Monitoring", body: "Baseline LFTs and CPK levels. Recheck LFTs 12 weeks after initiation and periodically thereafter. Monitor for muscle symptoms." },
            { label: "Key Interactions", body: "CYP3A4 inhibitors (azole antifungals, macrolides, grapefruit juice) increase atorvastatin levels and myopathy risk. Warfarin increases INR." },
          ],
        },
      },
    ];
export const SUGGESTED: string[] = [
      "How does ibuprofen's hepatotoxicity signal compare to diclofenac in the same period?",
      "Stratify the hypertension reports by age and sex.",
      "What confounders should I adjust for before escalating the hepatic signal?",
    ];
export const SAFETY_STEPS: FlowScriptStep[] = [
      {
        agentId: "planner", typingMs: 1100,
        getText: () => "Got it. Let's run a **FAERS signal detection**. Which compound are you investigating? Search by brand name, INN, or CAS number.",
        getComponent: () => ({ kind: "compound-selector" }),
      },
      {
        agentId: "planner", typingMs: 1000,
        getText: (s) => `Got it — **${s.compound}**. What reporting period should we analyze?`,
        getComponent: () => ({ kind: "date-range-selector" }),
      },
      {
        agentId: "planner", typingMs: 1000,
        getText: (s) => `Analyzing **${s.period}**. Which adverse event categories should we screen? Select all that apply.`,
        getComponent: () => ({ kind: "category-pills" }),
      },
      {
        agentId: "planner", typingMs: 1000,
        getText: () => "Here's what I'll analyze. Ready to proceed?",
        getComponent: (s) => ({ kind: "pre-analysis-card", params: { ...s } }),
      },
      {
        agentId: "planner", typingMs: 1000,
        getText: () => "Running the signal-detection pipeline — each agent reasons in turn:",
        getComponent: () => ({ kind: "planning-trace" }),
      },
    ];
export const PLANNER_THOUGHT: AgentThought = {
      interpretation: "User requests a post-marketing safety signal-detection run for **ibuprofen** (CAS 15687-27-1, propionic acid NSAID class) over FAERS Q3 2024, cross-referenced against EudraVigilance and WHO VigiBase. This is a formal disproportionality analysis under Evans signal-detection criteria: PRR ≥ 2.0, lower 95% CI bound ≥ 1.0, and N ≥ 3 cases. The scope covers all MedDRA v27.1 SOCs with priority on hepatic, cardiovascular, renal, and gastrointestinal PTs based on ibuprofen's known COX-1/2 inhibition pharmacology. PHI de-identification under HIPAA Safe Harbor (45 CFR §164.514(b)) and k-anonymity k ≥ 5 is mandatory before any results are released to the requester.",
      steps: [
        { kind: "reason", text: "First, confirming ibuprofen's FAERS presence and sizing the total ICSR corpus. Ibuprofen is both a prescription and OTC product, so the report volume is expected to be high. I need the exact count to calibrate the reference-group denominator for PRR calculation." },
        { kind: "tool", name: "openfda_query search", args: [
          { label: "category", value: "drug" }, { label: "endpoint", value: "event" },
          { label: "search", value: "patient.drug.medicinalproduct:ibuprofen" }, { label: "limit", value: "1" },
        ], result: "601,477 total matching ICSRs in FAERS (all-time)" },
        { kind: "reason", text: "Cross-referencing with EudraVigilance to confirm EU signal concordance. The European spontaneous reporting data uses EVCTM terminology, so I'll align on MedDRA PTs before comparing counts. High EU/US concordance on hepatic events would strengthen the causal inference significantly." },
        { kind: "tool", name: "eudravigilance_query search", args: [
          { label: "product", value: "IBUPROFEN" }, { label: "reaction_group", value: "Hepatobiliary" }, { label: "period", value: "2024-Q3" },
        ], result: "EU EudraVigilance: 187,234 total case reports; Hepatobiliary SOC: 2,109 cases" },
        { kind: "reason", text: "Pulling the current ibuprofen label to identify which hepatic signals are already documented in WARNINGS/PRECAUTIONS. Any signal we detect that is unlabeled becomes a Potential New Safety Signal (PNSS) requiring expedited regulatory communication. Already-labeled signals still need disproportionality quantification for trend monitoring." },
        { kind: "tool", name: "openfda_query search", args: [
          { label: "endpoint", value: "drug/label" }, { label: "search", value: "openfda.generic_name:ibuprofen" },
          { label: "fields", value: "warnings,precautions,adverse_reactions" },
        ], result: "Hepatic: elevated transaminases, jaundice, severe hepatic reactions listed in WARNINGS. Cardiovascular: MI, stroke, hypertension. Renal: acute renal failure, hyperkalemia." },
        { kind: "reason", text: "Label review complete. Hepatotoxicity and cardiovascular events are labeled but warrant fresh quantification given the Q3 2024 data window. Now scoping the PRR/ROR analysis parameters — setting MedDRA v27.1 as the PT hierarchy, using all-FAERS-minus-ibuprofen as the reference group, and applying Evans criteria with χ² ≥ 4 as the additional significance gate." },
        { kind: "tool", name: "plan_route", args: [
          { label: "Data Compiler", value: "FAERS Q3 2024 + EudraVigilance + label + PubMed literature retrieval" },
          { label: "Medical Reviewer", value: "PRR/ROR/IC batch (465 MedDRA terms) + Evans criteria + Bradford-Hill causality + forest plot + trend series" },
          { label: "PHI Guard", value: "HIPAA Safe Harbor 18-identifier scan + k-anonymity k≥5 + compliance attestation" },
        ], result: "3 agents dispatched in parallel — monitoring progress" },
        { kind: "reason", text: "Monitoring check #1 — Data Compiler is retrieving the Q3 2024 ICSR subset. Estimated ~2,800–3,200 reports based on historical quarterly rates. I'm holding the orchestration context open and watching for the structured count output before the Medical Reviewer can begin its disproportionality pass." },
        { kind: "reason", text: "Monitoring check #2 — Data Compiler has returned 2,847 ICSRs and the MedDRA PT frequency table. Medical Reviewer has started the disproportionality batch. PHI Guard is scanning in parallel. Pre-registering the report scaffold now: primary signal table → forest plot → PRR trend → case demographics → statistical tests → regulatory recommendation." },
        { kind: "reason", text: "Interim signal snapshot from Medical Reviewer: Hepatotoxicity PRR 3.2 exceeds the Evans threshold of 2.0, with χ² = 28.4 and N = 412 — this clears all three Evans gates and qualifies as a confirmed signal. Adjusting consolidation rules to flag this as tier-1 (Strong) and pre-populating the signal evaluation section of the report scaffold." },
        { kind: "reason", text: "All three agents have reported. PHI Guard has confirmed 0 identifiers in the output payload with k-anonymity verified. Validating cross-database consistency: FAERS PRR 3.2 vs EudraVigilance IC 1.7 (both above threshold). Signal direction is concordant across both pharmacovigilance databases. Proceeding to synthesise the consolidated signal evaluation report." },
      ],
    };
export const DATA_THOUGHT: AgentThought = { steps: [
      { kind: "reason", text: "Pulling ibuprofen spontaneous reports scoped to the Q3 2024 reporting window (receivedate 2024-07-01 to 2024-09-30). Applying the exact MedDRA preferred-term field for accurate downstream count aggregation — avoiding approximate text-match searches which inflate denominators." },
      { kind: "tool", name: "openfda_query search", args: [
        { label: "endpoint", value: "drug/event" },
        { label: "search", value: "patient.drug.medicinalproduct:ibuprofen+AND+receivedate:[20240701+TO+20240930]" },
        { label: "limit", value: "0" },
      ], result: "2,847 ICSRs in Q3 2024 — proceeding to count by MedDRA PT", subAgent: { id: "faers", name: "FAERS Retriever (openFDA)", status: "done" } },
      { kind: "reason", text: "Aggregating adverse-event reports by MedDRA preferred term using the exact-match field. I'll retrieve the top 50 PTs to cover all clinically meaningful signals, then the Medical Reviewer will run disproportionality on the full 465-term table above N ≥ 3." },
      { kind: "tool", name: "openfda_query count", args: [
        { label: "endpoint", value: "drug/event" },
        { label: "count_field", value: "patient.reaction.reactionmeddrapt.exact" },
        { label: "limit", value: "50" },
      ], result: "Hepatotoxicity 412 · Hypertension 287 · GI haemorrhage 198 · Renal impairment 156 · Cardiovascular event 89 · [+45 more terms above N≥3]", subAgent: { id: "faers", name: "FAERS Retriever (openFDA)", status: "done" } },
      { kind: "reason", text: "Stratifying case counts by patient demographics (age group, sex) to support the case-series demographics table and to check whether the hepatotoxicity signal is concentrated in a specific subpopulation — which would affect the causality tier and the PRR reference-group choice." },
      { kind: "tool", name: "openfda_query count", args: [
        { label: "endpoint", value: "drug/event" },
        { label: "count_field", value: "patient.patientonsetage_decade" },
        { label: "filter", value: "patient.reaction.reactionmeddrapt:hepatotoxicity" },
      ], result: "Age <18: 3.9% · 18–44: 21.4% · 45–64: 39.9% · ≥65: 34.7%", subAgent: { id: "faers", name: "FAERS Retriever (openFDA)", status: "done" } },
      { kind: "tool", name: "openfda_query count", args: [
        { label: "endpoint", value: "drug/event" },
        { label: "count_field", value: "patient.patientsex" },
        { label: "filter", value: "patient.reaction.reactionmeddrapt:hepatotoxicity" },
      ], result: "Female 58.3% · Male 38.6% · Unknown 3.1%", subAgent: { id: "faers", name: "FAERS Retriever (openFDA)", status: "done" } },
      { kind: "reason", text: "Checking reporter type and seriousness distribution for the hepatotoxicity cases — important for assessing case quality (HCP-reported cases carry higher evidential weight) and for determining whether the signal is concentrated in serious outcomes." },
      { kind: "tool", name: "openfda_query count", args: [
        { label: "count_field", value: "primarysourcecountry.exact" }, { label: "filter", value: "hepatotoxicity" },
        { label: "top", value: "5" },
      ], result: "US 47.1% · Germany 8.3% · UK 7.2% · France 6.8% · Australia 4.1%", subAgent: { id: "faers", name: "FAERS Retriever (openFDA)", status: "done" } },
      { kind: "reason", text: "Cross-referencing with EudraVigilance to confirm EU signal concordance for the hepatotoxicity PT. The EU spontaneous reporting system uses the same MedDRA terminology so a direct comparison is valid." },
      { kind: "tool", name: "eudravigilance_query search", args: [
        { label: "product", value: "IBUPROFEN" }, { label: "reaction_pt", value: "Hepatocellular damage" }, { label: "period", value: "2024-Q3" },
      ], result: "EU: 312 cases of hepatobiliary PTs — concordant with US signal direction", subAgent: { id: "eudra", name: "EudraVigilance", status: "done" } },
      { kind: "reason", text: "Pulling supporting literature for the hepatotoxicity signal — checking for mechanistic plausibility studies, existing systematic reviews on NSAID hepatotoxicity, and any post-marketing studies that quantified this association independently." },
      { kind: "tool", name: "pubmed_search", args: [
        { label: "query", value: "ibuprofen hepatotoxicity disproportionality spontaneous reporting FAERS" },
        { label: "date_range", value: "2018-2024" }, { label: "max_results", value: "25" },
      ], result: "22 records retrieved — 8 directly relevant (PubMed + Europe PMC). Top hit: Sgro et al. 2022 DILI Network — ibuprofen ranked 4th most common NSAID-associated DILI cause.", subAgent: { id: "pubmed", name: "PubMed Search", status: "done" } },
      { kind: "tool", name: "clinicaltrials_query", args: [{ label: "drug", value: "ibuprofen" }], result: "Retrieved 15 completed phase III trials for cardiovascular safety outcomes", subAgent: { id: "clinicaltrials", name: "Clinical Trials", status: "done" } },
      { kind: "tool", name: "europepmc_search", args: [{ label: "query", value: "ibuprofen DILI cox pathway" }], result: "Retrieved 34 open-access full-text papers", subAgent: { id: "europepmc", name: "Europe PMC", status: "done" } },
      { kind: "tool", name: "biorxiv_search", args: [{ label: "query", value: "ibuprofen hepatic toxicology preprint" }], result: "Retrieved 5 relevant preprints (flagged: not peer-reviewed)", subAgent: { id: "biorxiv", name: "bioRxiv Search", status: "done" } },
      { kind: "tool", name: "openalex_search", args: [{ label: "query", value: "NSAID hepatotoxicity citation graph" }], result: "Retrieved 120 citation network nodes mapping DILI clusters", subAgent: { id: "openalex", name: "OpenAlex Search", status: "done" } },
      { kind: "reason", text: "Quality-checking a random sample of 50 case narratives. I spotted 34 records with inconsistent onset dates — the adverse event onset date predates the drug start date, which is a known FAERS data-entry artefact. Flagging these for exclusion from the onset-time analysis but retaining them in the disproportionality count since the AE association is still valid." },
    ] };
export const MEDICAL_THOUGHT: AgentThought = { steps: [
      { kind: "reason", text: "Loading the 2,847 Q3 2024 ICSRs from the Data Compiler output. Setting up the reference group as all FAERS minus ibuprofen-associated reports to avoid self-referential contamination of the denominator. Using MedDRA v27.1 PT hierarchy. Minimum case threshold N ≥ 3 per Evans criteria — this gives us 465 PTs to evaluate.", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "tool", name: "disproportionality.compute", args: [
        { label: "method", value: "PRR + ROR + χ²" }, { label: "reference_group", value: "all-FAERS-minus-drug" },
        { label: "min_n", value: "3" }, { label: "meddra_version", value: "27.1" },
      ], result: "Primary signal: Hepatotoxicity PRR 3.20 (95% CI 2.10–4.80), χ²=28.4, ROR 3.4 (2.1–4.8), N=412 — STRONG signal per Evans", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "reason", text: "Running the full batch computation across all 465 eligible MedDRA PTs. This will generate the complete signal landscape for the forest plot, the 15-row statistical tests table sample, and the signal overview. I'll apply Evans gating (PRR ≥ 2, lower 95% CI ≥ 1, N ≥ 3) to classify each term as Strong / Moderate / Weak / No signal.", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "tool", name: "disproportionality.compute batch", args: [
        { label: "terms", value: "465 MedDRA PTs" }, { label: "method", value: "PRR + ROR + BCPNN-IC" },
        { label: "gate", value: "Evans: PRR≥2 AND CI_lo≥1 AND N≥3" },
      ], result: "465 terms evaluated: 3 Strong (PRR≥2, χ²≥4, CI_lo≥1), 2 Moderate (PRR≥2 only), 3 Weak (CI spans 1.0), 457 No signal — forest plot coordinates generated", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "reason", text: "Applying Bradford-Hill causality criteria to the primary hepatotoxicity signal: (1) Strength — PRR 3.2, strong association. (2) Consistency — concordant in FAERS and EudraVigilance. (3) Dose-response — checking whether higher doses associate with more severe hepatic outcomes. (4) Biological plausibility — COX inhibition affects hepatic prostaglandin synthesis; mitochondrial impairment reported in in-vitro NSAID hepatotoxicity literature. (5) Temporality — need time-to-onset analysis from Data Compiler.", subAgent: { id: "chembl", name: "ChEMBL Query", status: "done" } },
      { kind: "tool", name: "chembl_query", args: [
        { label: "molecule", value: "ibuprofen" }, { label: "fields", value: "mechanism_of_action,target_organism,clinical_significance" },
      ], result: "COX-1/2 non-selective inhibitor; hepatic mitochondrial uncoupling documented in rat models; reactive ibuprofen-acyl-glucuronide metabolite implicated in covalent protein binding → hepatocyte injury", subAgent: { id: "chembl", name: "ChEMBL Query", status: "done" } },
      { kind: "tool", name: "clinvar_query", args: [{ label: "gene", value: "CYP2C9" }, { label: "variant", value: "rs1799853" }], result: "ClinVar: *3 allele (low metabolizer) associated with reduced ibuprofen clearance and elevated GI bleeding risk", subAgent: { id: "genomics_validator", name: "Genomics Validator", status: "done" } },
      { kind: "tool", name: "gnomad_query", args: [{ label: "gene", value: "CYP2C9" }], result: "gnomAD: *3 allele frequency ~7% in European populations", subAgent: { id: "genomics_validator", name: "Genomics Validator", status: "done" } },
      { kind: "tool", name: "ensembl_lookup", args: [{ label: "gene", value: "CYP2C9" }], result: "Ensembl: retrieved genomic coordinates chr10:94938658-94990091", subAgent: { id: "genomics_validator", name: "Genomics Validator", status: "done" } },
      { kind: "tool", name: "opentargets_query", args: [{ label: "target", value: "PTGS1" }, { label: "disease", value: "gastric ulcer" }], result: "Open Targets: PTGS1 (COX-1) has strong genetic association score (0.84) to drug-induced gastric ulceration", subAgent: { id: "pathway_analyst", name: "Pathway Analyst", status: "done" } },
      { kind: "tool", name: "reactome_pathways", args: [{ label: "pathway", value: "Prostaglandin synthesis" }], result: "Reactome: NSAIDs inhibit Arachidonate COX pathway (R-HSA-2162222)", subAgent: { id: "pathway_analyst", name: "Pathway Analyst", status: "done" } },
      { kind: "tool", name: "pubchem_query", args: [{ label: "compound", value: "ibuprofen" }], result: "PubChem CID 3672: molecular formula C13H18O2, binds to prostaglandin G/H synthase 1/2", subAgent: { id: "molecular_profiler", name: "Molecular Profiler", status: "done" } },
      { kind: "tool", name: "uniprot_lookup", args: [{ label: "protein", value: "P35354" }], result: "UniProt: PTGS2 (COX-2) functional annotation, active site residues Tyr385, Arg120", subAgent: { id: "molecular_profiler", name: "Molecular Profiler", status: "done" } },
      { kind: "tool", name: "string_interactions", args: [{ label: "protein", value: "PTGS2" }], result: "STRING: network shows high confidence interactions with PTGS1, ALOX5, and CYP2C9", subAgent: { id: "molecular_profiler", name: "Molecular Profiler", status: "done" } },
      { kind: "tool", name: "hpa_expression", args: [{ label: "protein", value: "CYP2C9" }], result: "Human Protein Atlas: highly expressed in hepatocytes, low expression in kidney/duodenum", subAgent: { id: "molecular_profiler", name: "Molecular Profiler", status: "done" } },
      { kind: "reason", text: "Computing PRR trend series from quarterly slices (Q4 2022 → Q3 2024) to assess whether the hepatotoxicity signal is stable, increasing, or decreasing. An increasing trend would trigger an expedited safety communication recommendation.", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "tool", name: "disproportionality.compute_trend", args: [
        { label: "signal", value: "Hepatotoxicity" }, { label: "quarters", value: "Q4 2022 → Q3 2024" },
        { label: "method", value: "PRR with rolling 95% CI" },
      ], result: "Trend: Q4 2022 PRR 2.6 → Q3 2024 PRR 3.2. Monotonic increase over 8 quarters — statistically significant upward trend (p=0.003). Expedited communication warranted.", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "reason", text: "Assessing dose-response relationship to strengthen causal inference. Will query the subset of cases that include dosage information (subset quality caveat: FAERS dose reporting is ~40% complete).", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "tool", name: "pubmed_search", args: [
        { label: "query", value: "NSAID ibuprofen dose-dependent hepatotoxicity Bradford-Hill causality systematic review" },
        { label: "filters", value: "systematic review OR meta-analysis" },
      ], result: "3 systematic reviews support dose-response plausibility; 2 case series confirm higher-dose (≥1200mg/day) predominance in severe hepatic DILI", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "reason", text: "Assigning final WHO-UMC causality classification and CIOMS signal tier. Hepatotoxicity meets criteria for PROBABLE causality (strength, consistency, biological plausibility, dose-response signal, dechallenge data in FAERS). Signal tier: STRONG — qualifies as a Confirmed Pharmacovigilance Signal under ICH E2C(R2). Regulatory recommendation: expedited PSUR update + REMS assessment.", subAgent: { id: "disprop", name: "Disproportionality", status: "done" } },
      { kind: "reason", text: "Handing off validated signal data to QA Validator for biological bounds checking and statistical consistency audit before final report generation.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "tool", name: "bounds_check", args: [
        { label: "rules", value: "age <= 120 · weight <= 300kg · daily_dose <= max_recommended" },
        { label: "records", value: "2,847" }
      ], result: "Detected 2 records with biological anomalies: (1) patient weight 340 kg, (2) patient age 142 years.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "reason", text: "Anomaly detected in patient age and weight fields (likely transmission errors). Attempt 1: Attempting to resolve anomalies by querying original source reports for correction.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "tool", name: "resolve_anomalies_attempt_1", args: [
        { label: "anomalous_records", value: "2" },
        { label: "method", value: "cross-check with source hospital logs" }
      ], result: "Attempt 1 failed: source database timed out. Querying backup mirror (Attempt 2).", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "reason", text: "Attempt 2: Backup mirror query initiated to resolve anomalous values.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "tool", name: "resolve_anomalies_attempt_2", args: [
        { label: "anomalous_records", value: "2" },
        { label: "method", value: "cross-check with secondary EMA repository" }
      ], result: "Attempt 2 failed: secondary repository returned incomplete payload. Attempting final resolution (Attempt 3).", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "reason", text: "Attempt 3: Performing statistical imputation and manual validation for age (142 -> 42) and weight (340 -> 74) based on contextual drug dosage.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "tool", name: "resolve_anomalies_attempt_3", args: [
        { label: "imputation_rules", value: "mean-matching based on dosage profile" }
      ], result: "Attempt 3 Succeeded: anomalously high age (142) and weight (340 kg) resolved. Final data set validated with zero errors.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
      { kind: "reason", text: "All anomalies resolved. The final signal evaluation is clean, consistent, and validated. Forwarding the approved QA report to the Planner.", subAgent: { id: "qa", name: "QA Validator", status: "done" } },
    ] };
export const PHI_THOUGHT: AgentThought = { steps: [
      { kind: "reason", text: "Loading the complete 2,847 ICSR narrative text blobs from the Data Compiler output. Initiating the 18-identifier HIPAA Safe Harbor scan. The identifiers are grouped into name/contact, geographic, temporal, and biometric categories — I'll scan each group in parallel sub-passes to maximise throughput while maintaining a complete audit trail." },
      { kind: "tool", name: "phi_scan NAMES+CONTACTS", args: [
        { label: "records", value: "2,847" }, { label: "identifiers", value: "Names · Phone · Fax · Email · SSN · MRN · Health plan · Account · Certificate · VIN · Device · Web URL · IP address" },
        { label: "method", value: "NLP entity recognition + regex pattern matching" },
      ], result: "0 name/contact identifiers detected in structured output fields" },
      { kind: "tool", name: "phi_scan DATES+GEOGRAPHY", args: [
        { label: "identifiers", value: "Dates (except year) · Geographic subdivisions below state · ZIP > 3 digits" },
        { label: "records", value: "2,847" },
      ], result: "3 records contain sub-state geographic references (city-level) — flagged for suppression" },
      { kind: "reason", text: "Three records contain city-level geographic detail in the 'reporter address' free-text field. These will be generalised to state-level before release. No exact birth dates found — only year-of-birth reported, which is permissible under Safe Harbor. Continuing to biometric identifier scan." },
      { kind: "tool", name: "phi_scan BIOMETRIC", args: [
        { label: "identifiers", value: "Biometric identifiers · Full face photos · Unique identifiers" },
        { label: "records", value: "2,847" },
      ], result: "0 biometric identifiers detected" },
      { kind: "tool", name: "deidentify", args: [
        { label: "method", value: "Safe Harbor: geographic suppression (city → state)" },
        { label: "records_modified", value: "3" },
        { label: "k_anonymity_check", value: "k≥5 on age-sex-state quasi-identifier combinations" },
      ], result: "k-anonymity verified: minimum group size 7 across all quasi-identifier combinations — compliant" },
      { kind: "reason", text: "Running the k-anonymity check against all quasi-identifier combinations: age-decade × sex × state × reporter-type. The smallest group has 7 cases (k=7 > 5), confirming that no individual can be re-identified from the released aggregate data. All age groups reported as decades, not exact years." },
      { kind: "tool", name: "phi_scan FINAL_AUDIT", args: [
        { label: "output_fields", value: "All 47 output fields in the report payload" },
        { label: "records", value: "2,847 (3 modified)" }, { label: "standard", value: "HIPAA Safe Harbor §164.514(b) + k-anonymity k≥5" },
      ], result: "FINAL AUDIT: 0 identifiers in output payload — COMPLIANT. Attestation ID: PHI-2024-Q3-IBU-0041" },
      { kind: "tool", name: "ols_normalize", args: [{ label: "ontology", value: "MedDRA" }, { label: "term", value: "Hepatotoxicity" }], result: "OLS: Term normalized to 'Drug-induced liver injury' (MedDRA v27.1 PT 10084268)", subAgent: { id: "ols_normalize", name: "EBI OLS Normalization", status: "done" } },
      { kind: "reason", text: "Generating the signed PHI compliance attestation. The output payload is cleared for release. Attestation covers: (1) all 18 Safe Harbor identifiers scanned, (2) 3 geographic fields generalised, (3) k-anonymity verified at k≥7, (4) no individual re-identification risk in aggregate statistics. Returning compliance certificate to Planner for inclusion in the final consolidated report." },
    ] };
export const TRACE_AGENTS: { agentId: string; thought: AgentThought; startMs: number }[] = [
      { agentId: "planner", thought: PLANNER_THOUGHT, startMs: 0 },
      { agentId: "data",    thought: DATA_THOUGHT,    startMs: 7000 },
      { agentId: "medical", thought: MEDICAL_THOUGHT, startMs: 16000 },
      { agentId: "phi",     thought: PHI_THOUGHT,     startMs: 28000 },
    ];
export const SYNTHESIS_SEQUENCE: SynthesisStep[] = [
      {
        agentId: "planner", delayMs: 1300, result: true,
        getText: (s) => `All four agents have reported. Here's the consolidated **signal evaluation** for **${s.compound || "the compound"}** in ${s.period || "Q3 2024"}:`,
      },
    ];
export const STORE_TEMPLATES = [
      { name: "Nephrotoxicity Checker", role: "Kidney clearance modeling", desc: "Analyzes GFR changes and acute kidney injury biomarkers from FAERS narratives.", color: "#0284c7", parent: "medical", capability: "disprop" },
      { name: "Pediatric Safety Lead",  role: "Off-label dosage analysis",  desc: "Evaluates pediatric safety reporting profiles and cohort-specific AE rates.", color: "#db2777", parent: "medical", capability: "qa" },
      { name: "Geriatric Risk Assessor",role: "Polypharmacy interactions",  desc: "Analyzes age-related disproportionality metrics and drug-drug hazard coefficients.", color: "#7c3aed", parent: "medical", capability: "disprop" },
      { name: "Teratogenicity Shield",  role: "Pregnancy registry checks",  desc: "Scans clinical trials and safety registries for maternal-fetal hazard markers.", color: "#b45309", parent: "data", capability: "clinicaltrials" },
      { name: "Safe-Harbor Redactor",   role: "PHI narrative scrub",        desc: "Scans and redacts names, dates, and locations from unstructured clinical reports.", color: "#d97706", parent: "phi", capability: "narrative_redact" },
      { name: "EBI OLS Mapper",         role: "Ontology normalization",      desc: "Normalizes user-specified drug and disease terms to official ontology standards.", color: "#d97706", parent: "phi", capability: "ols_normalize" }
    ];
export const COMMS_LOG = [
      { t: "0:00", from: "planner",  to: "data",    label: "retrieve FAERS Q3 2024" },
      { t: "0:02", from: "planner",  to: "medical", label: "compute PRR batch" },
      { t: "0:04", from: "planner",  to: "phi",     label: "scan 2847 narratives" },
      { t: "0:18", from: "data",     to: "planner", label: "2847 ICSRs compiled" },
      { t: "0:24", from: "medical",  to: "planner", label: "465 signals flagged" },
      { t: "0:29", from: "phi",      to: "planner", label: "0 identifiers in output" },
      { t: "0:31", from: "planner",  to: "medical", label: "consolidate report" },
      { t: "0:44", from: "medical",  to: "planner", label: "report ready" },
    ];
export const MAX_FILES = 5;
export const BEAM_MS = 850;
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const YEARS = Array.from({ length: 10 }, (_, i) => 2017 + i);
export const DRUG_TAB_ORDER: (keyof DrugInfo["tabs"])[] = ["Overview", "Dosing", "Safety", "Clinical"];
export const SIGNAL_COLOR = { strong: "#dc2626", moderate: "#d97706", weak: "#94a3b8" };
export const CHART_SOURCES: Record<string, { summary: string; raw: string[] }> = {
      forest:   { summary: "Disproportionality analysis of 2,847 FAERS ICSRs Q1 2022–Q3 2024. PRR computed against all-FAERS reference group using Evans criteria (PRR ≥ 2, N ≥ 3, lower 95% CI ≥ 1).", raw: ["FAERS Q3 2024 export", "2,847 ICSRs total", "MedDRA v27.0 coding", "openfda.hhs.gov"] },
      prr:      { summary: "Quarterly PRR trend computed across 8 rolling quarters (Q4 2022–Q3 2024). Threshold line at PRR=2 per ICH E2E guidance. Signal detected 6 consecutive quarters.", raw: ["FAERS quarterly extracts Q4 2022–Q3 2024", "Evans criteria thresholds", "ICH E2E Signal Detection Guideline"] },
      quarterly:{ summary: "Case count comparison: ibuprofen spontaneous reports vs. all-FAERS background per quarter. Normalised per 100k reports. Growing gap first observed Q1 2023.", raw: ["FAERS case counts by quarter", "Background reference group: all-FAERS minus ibuprofen", "Denominator: total quarterly reports"] },
      onset:    { summary: "Time-to-onset distribution from first dose to AE report date for 2,412 hepatotoxicity cases with onset data. Peak incidence 8–30 days post-exposure.", raw: ["FAERS narrative text fields", "2,412 cases with onset dates available", "Kernel density estimate bandwidth: 5 days"] },
      km:       { summary: "Kaplan–Meier event-free survival estimates for hepatotoxicity endpoint. Ibuprofen-exposed (n=2,847) vs. unexposed reference cohort (n=12,400). Log-rank p < 0.001.", raw: ["Survival analysis: 2,847 exposed cases", "Reference cohort: 12,400 matched controls", "Log-rank test p < 0.001"] },
      risk:     { summary: "Signal tier matrix mapping PRR strength vs. clinical severity using WHO-UMC causality criteria. Hepatotoxicity classified as Tier-1 confirmed signal.", raw: ["WHO-UMC causality assessment scale", "CIOMS signal tier mapping framework", "MedDRA SMQ: Drug-related hepatic disorders"] },
    };
export const FOREST_ROWS: ForestRow[] = [
      { pt: "Hepatotoxicity",       prr: 3.20, ci_lo: 2.10, ci_hi: 4.80, n: 412, ror: 3.4, signal: "Strong" },
      { pt: "Hypertension",         prr: 2.10, ci_lo: 1.40, ci_hi: 3.10, n: 287, ror: 2.2, signal: "Moderate" },
      { pt: "Cardiovascular event", prr: 1.85, ci_lo: 1.20, ci_hi: 2.85, n: 89,  ror: 2.0, signal: "Moderate" },
      { pt: "Renal impairment",     prr: 1.40, ci_lo: 0.85, ci_hi: 2.20, n: 156, ror: 1.5, signal: "Weak" },
      { pt: "GI Haemorrhage",       prr: 1.60, ci_lo: 0.90, ci_hi: 2.70, n: 198, ror: 1.6, signal: "Weak" },
    ];
export const TREND_DATA: TrendPoint[] = [
      { quarter: "Q4 2022", prr: 2.6, ci_lo: 1.8, ci_hi: 3.7 },
      { quarter: "Q1 2023", prr: 2.7, ci_lo: 1.9, ci_hi: 3.8 },
      { quarter: "Q2 2023", prr: 2.8, ci_lo: 1.9, ci_hi: 4.0 },
      { quarter: "Q3 2023", prr: 2.9, ci_lo: 2.0, ci_hi: 4.1 },
      { quarter: "Q4 2023", prr: 3.0, ci_lo: 2.0, ci_hi: 4.4 },
      { quarter: "Q1 2024", prr: 3.1, ci_lo: 2.1, ci_hi: 4.5 },
      { quarter: "Q2 2024", prr: 3.1, ci_lo: 2.1, ci_hi: 4.6 },
      { quarter: "Q3 2024", prr: 3.2, ci_lo: 2.1, ci_hi: 4.8 },
    ];
export const QUARTERLY_COUNTS: QuarterlyCount[] = [
      { quarter: "Q4 '22", drug: 48,  bg: 312 },
      { quarter: "Q1 '23", drug: 52,  bg: 298 },
      { quarter: "Q2 '23", drug: 61,  bg: 305 },
      { quarter: "Q3 '23", drug: 74,  bg: 318 },
      { quarter: "Q4 '23", drug: 88,  bg: 310 },
      { quarter: "Q1 '24", drug: 97,  bg: 302 },
      { quarter: "Q2 '24", drug: 108, bg: 315 },
      { quarter: "Q3 '24", drug: 122, bg: 309 },
    ];
export const ONSET_BUCKETS: OnsetBucket[] = [
      { label: "0–7 days",    n: 58  },
      { label: "8–30 days",   n: 134 },
      { label: "31–90 days",  n: 112 },
      { label: "91–180 days", n: 67  },
      { label: ">180 days",   n: 41  },
    ];
export const KM_CURVE: KMPoint[] = [
      { day: 0,   drug: 1.000, bg: 1.000, drug_lo: 1.000, drug_hi: 1.000 },
      { day: 30,  drug: 0.985, bg: 0.997, drug_lo: 0.978, drug_hi: 0.991 },
      { day: 90,  drug: 0.971, bg: 0.994, drug_lo: 0.962, drug_hi: 0.980 },
      { day: 180, drug: 0.956, bg: 0.992, drug_lo: 0.945, drug_hi: 0.967 },
      { day: 365, drug: 0.938, bg: 0.990, drug_lo: 0.926, drug_hi: 0.951 },
      { day: 548, drug: 0.921, bg: 0.988, drug_lo: 0.908, drug_hi: 0.935 },
      { day: 730, drug: 0.908, bg: 0.987, drug_lo: 0.894, drug_hi: 0.923 },
    ];
export const RISK_SEVERITY = ["Fatal", "Life-threatening", "Hospitalisation", "Moderate", "Mild"];
export const RISK_SIGNAL = ["Unlikely\n(Weak)", "Possible\n(Moderate)", "Likely\n(Strong)"];
export const RISK_COLORS = [
      ["#fef3c7","#fca5a5","#ef4444"],
      ["#fef9c3","#fca5a5","#dc2626"],
      ["#dcfce7","#fef3c7","#fb923c"],
      ["#dcfce7","#dcfce7","#fef3c7"],
      ["#d1fae5","#dcfce7","#dcfce7"],
    ];
export const RISK_SIGNALS: RiskCell[] = [
      { sigIdx: 2, sevIdx: 2, label: "Hepatotoxicity", highlight: true },
      { sigIdx: 1, sevIdx: 3, label: "Hypertension" },
      { sigIdx: 1, sevIdx: 3, label: "CV event" },
      { sigIdx: 0, sevIdx: 3, label: "Renal impairment" },
      { sigIdx: 0, sevIdx: 3, label: "GI haemorrhage" },
    ];
export const CASE_DEMOGRAPHICS: DemoFeature[] = [
      { feature: "Sex", rows: [{ modality: "Female", value: "241 (58.5%)" }, { modality: "Male", value: "171 (41.5%)" }] },
      { feature: "Age group", rows: [
        { modality: "18–44 years", value: "82 (19.9%)" }, { modality: "45–64 years", value: "168 (40.8%)" },
        { modality: "≥65 years", value: "143 (34.7%)" }, { modality: "Unknown", value: "19 (4.6%)" },
      ]},
      { feature: "Reporter type", rows: [
        { modality: "Physician", value: "198 (48.1%)" }, { modality: "Pharmacist", value: "87 (21.1%)" },
        { modality: "Consumer", value: "74 (18.0%)" }, { modality: "Other HCP", value: "53 (12.9%)" },
      ]},
      { feature: "Seriousness", rows: [
        { modality: "Hospitalisation", value: "203 (49.3%)" }, { modality: "Life-threatening", value: "89 (21.6%)" },
        { modality: "Other serious", value: "98 (23.8%)" }, { modality: "Non-serious", value: "22 (5.3%)" },
      ]},
      { feature: "Outcome", rows: [
        { modality: "Not recovered", value: "187 (45.4%)" }, { modality: "Recovering", value: "124 (30.1%)" },
        { modality: "Recovered", value: "78 (18.9%)" }, { modality: "Fatal", value: "23 (5.6%)" },
      ]},
      { feature: "Country of report", rows: [
        { modality: "United States", value: "197 (47.8%)" }, { modality: "Germany", value: "61 (14.8%)" },
        { modality: "France", value: "44 (10.7%)" }, { modality: "United Kingdom", value: "38 (9.2%)" },
        { modality: "Other", value: "72 (17.5%)" },
      ]},
    ];
export const MULTI_SIGNAL_ROWS: { feature: string; modality: string; hepato: string; hyper: string; gi: string }[] = [
      { feature: "Sex",          modality: "Female",          hepato: "58.5%", hyper: "44.2%", gi: "51.0%" },
      { feature: "",             modality: "Male",            hepato: "41.5%", hyper: "55.8%", gi: "49.0%" },
      { feature: "Age",          modality: "≥65 years",       hepato: "34.7%", hyper: "52.6%", gi: "38.4%" },
      { feature: "",             modality: "18–64 years",     hepato: "60.7%", hyper: "43.4%", gi: "57.2%" },
      { feature: "Seriousness",  modality: "Hospitalisation", hepato: "49.3%", hyper: "31.4%", gi: "67.2%" },
      { feature: "",             modality: "Fatal",           hepato: "5.6%",  hyper: "2.1%",  gi: "8.2%"  },
    ];
export const AGENT_PANEL_INTROS: Record<string, string> = {
      planner:  "I coordinate the analysis pipeline and decompose complex safety queries into subtasks. Ask me about query strategy, scope, or to kick off a new analysis.",
      data:     "I retrieve and compile evidence from FAERS, EudraVigilance, and PubMed. Ask me about data coverage, retrieval parameters, or raw case counts.",
      medical:  "I apply clinical reasoning and MedDRA classification to safety signals. Ask me to interpret PRR findings, assess causality, or review disproportionality results.",
      phi:      "I ensure HIPAA/GDPR compliance across all outputs. Ask me about PHI exposure risk, de-identification status, or compliance checks on narratives.",
    };
export const PROMPT_CHIPS = [
      { label: "Signal Detection",  prompt: "Run FAERS signal detection for a compound" },
      { label: "Cohort Builder",    prompt: "Build a patient cohort for my study" },
      { label: "Genomics Audit",    prompt: "Audit pharmacogenomic interactions" },
      { label: "B/R Report",        prompt: "Compile a benefit-risk assessment" },
    ];

export type TemporalMode = "range" | "drug-window" | "pre-event" | "post-event";
export type AdvancedParams = {
      temporal:       { mode: TemporalMode; windowDays?: number; anchorEvent?: string; preEventDays?: number; postEventDays?: number };
      demographics:   { ageMin?: number; ageMax?: number; sex: "all" | "male" | "female" };
      caseDetails:    { reporterTypes: string[]; seriousness: string[]; outcomes: string[] };
      geographic:     { regions: string[] };
      drugDetails:    { routes: string[]; concomitantDrugs: string[] };
      signalDetection:{ method: "PRR" | "ROR" | "BCPNN" | "IC"; prrThreshold: number; minN: number; ciLevel: number };
    };
export type SourceId = "faers" | "eudravigilance" | "vigibase" | "clinicaltrials" | "pubmed" | "europepmc"
      | "biorxiv" | "openalex" | "clinvar" | "gnomad" | "ensembl" | "opentargets" | "reactome"
      | "pubchem" | "uniprot" | "string" | "hpa" | "chembl" | "ols";

export type AnalysisScience = {
  sources: SourceId[];
  gene?: string;
  variant?: string;
  population?: string;
  clinicalSignificance?: string[];
  litSources?: string[];
  dateFrom?: string;
  dateTo?: string;
  peerReviewedOnly?: boolean;
  trialPhase?: string[];
  indication?: string;
};

export type AnalysisState = { compound: string; period: string; categories: string[]; advanced?: AdvancedParams; isSurveillance?: boolean; isSigned?: boolean; reportId?: string; analysisType?: "signal" | "cohort" | "genomics" | "benefit-risk" | "literature"; science?: AnalysisScience };
export type StepStatus = "pending" | "active" | "done";
export type EvidenceStrength = "very-high" | "high" | "moderate" | "low";
export type SignalRow = {
      event: string; prr: string; ci: string; n: number;
      level: "strong" | "moderate" | "weak";
      chi2?: string; ror?: string; // disproportionality detail for the stats table
    };
export type Reference = {
      n: number; title: string; journal: string; authors: string; year: number;
      evidenceStrength: EvidenceStrength;
      studyType: string;
      evidenceSnapshot?: { summary: string; studyDesign: string; population: string };
    };
export type InlineSeg = | { t: "text"; v: string }
      | { t: "bold"; v: string }
      | { t: "em"; v: string }
      | { t: "cite"; ref: number; strength: EvidenceStrength };
export type AnswerBlock = | { kind: "heading"; text: string }
      | { kind: "paragraph"; segs: InlineSeg[] }
      | { kind: "bullets"; items: InlineSeg[][] }
      | { kind: "divider" }
      | { kind: "callout"; segs: InlineSeg[] }
      | { kind: "signal-table"; rows: SignalRow[] }
      | { kind: "table"; headers: string[]; rows: InlineSeg[][][] };
export type DrugSection = { label: string; body: string };
export type DrugInfo = {
      name: string; className: string;
      tabs: {
        Overview?: DrugSection[]; Dosing?: DrugSection[];
        Safety?: DrugSection[]; Clinical?: DrugSection[];
      };
      refIndices?: number[];
    };
export type ResultData = {
      answer: AnswerBlock[]; drugs: DrugInfo[];
      signals: SignalRow[]; refs: Reference[]; suggested: string[];
      params: AnalysisState;
      artifactTitle: string; artifactQuery: string;
    };
export type FlowComponent = | { kind: "compound-selector" }
      | { kind: "date-range-selector" }
      | { kind: "category-pills" }
      | { kind: "pre-analysis-card"; params: AnalysisState }
      | { kind: "planning-trace" }
      | { kind: "result-tabs"; data: ResultData }
      | { kind: "permission-request"; agentId: string; requestText: string; costNote?: string };
export type ToolArg = { label: string; value: string };
export type ThoughtStep = | { kind: "reason"; text: string; subAgent?: { id: string; name: string; status: "thinking" | "generating" | "done" } }
      | { kind: "tool"; name: string; args?: ToolArg[]; result?: string; subAgent?: { id: string; name: string; status: "thinking" | "generating" | "done" } };
export type AgentThought = { interpretation?: string; steps: ThoughtStep[] };
export type ChatMessage = {
      id: number; type: "user" | "agent"; text?: string; agent?: string;
      component?: FlowComponent; locked?: boolean; selection?: string; thought?: AgentThought;
      agentThread?: string; contextCard?: string; noStream?: boolean;
    };
export type AgentConversation = {
      id: string;
      agentId: string;
      label: string;
      messages: { role: "user" | "agent"; text: string; contextCard?: string }[];
    };
export type FlowScriptStep = {
      agentId: string; typingMs: number;
      getText: (s: AnalysisState) => string;
      getComponent?: (s: AnalysisState) => FlowComponent;
    };
export type SynthesisStep = { agentId: string; delayMs: number; getText: (s: AnalysisState) => string; result?: boolean };
export type AgentActivity = "thinking" | "generating" | "user-needed";
export type RespLength = "detailed" | "quick";
export type SegUnit = | { kind: "word"; word: string; style: "text" | "bold" | "em" }
      | { kind: "cite"; ref: number; strength: EvidenceStrength };
export type ForestRow = { pt: string; prr: number; ci_lo: number; ci_hi: number; n: number; ror: number; signal: "Strong" | "Moderate" | "Weak" };
export type TrendPoint = { quarter: string; prr: number; ci_lo: number; ci_hi: number };
export type QuarterlyCount = { quarter: string; drug: number; bg: number };
export type OnsetBucket = { label: string; n: number };
export type KMPoint = { day: number; drug: number; bg: number; drug_lo: number; drug_hi: number };
export type RiskCell = { sigIdx: number; sevIdx: number; label: string; highlight?: boolean };
export type DemoFeature = { feature: string; rows: { modality: string; value: string }[] };
export type ArtifactTab = "charts" | "agents";
export type ResultTab = "answer" | "drug" | "references";
export type WordTok = { word: string; bold: boolean };

export type SubAgent = {
  id: string;
  name: string;
  icon: string;
  parentId: "data" | "medical" | "phi";
  origin: "builtin" | "store" | "custom";
  status: "validated" | "review" | "sandbox";
  scope: "org" | "personal";
  owner?: string;
  capability: string;
  desc: string;
  instructions?: string;
  knowledge?: string[];
};

export const RETRIEVAL_SOURCES = [
  { id: "faers", name: "FAERS Retriever (openFDA)", desc: "Retrieves US FDA Adverse Event Reporting System data" },
  { id: "eudra", name: "EudraVigilance", desc: "Retrieves European Medicines Agency safety data" },
  { id: "vigiaccess", name: "VigiBase", desc: "Retrieves WHO international drug monitoring database data" },
  { id: "pubmed", name: "PubMed Search", desc: "Retrieves literature citations and abstracts from MEDLINE" },
  { id: "clinicaltrials", name: "Clinical Trials", desc: "Retrieves registered study designs and outcome results" },
  { id: "europepmc", name: "Europe PMC", desc: "Retrieves open-access biomedical literature abstracts and full texts" },
  { id: "biorxiv", name: "bioRxiv Search", desc: "Retrieves preprint publications in life sciences" },
  { id: "openalex", name: "OpenAlex Search", desc: "Retrieves global research documents and metadata graph" },
];

export const VALIDATION_METHODS = [
  { id: "disprop", name: "Disproportionality", desc: "Calculates disproportionality metrics (PRR, ROR, chi2)" },
  { id: "chembl", name: "ChEMBL Query", desc: "Retrieves chemical structure and bioactivity data for compounds" },
  { id: "qa", name: "QA Validator", desc: "Performs validation and quality checks on signals" },
  { id: "genomics_validator", name: "Genomics Validator", desc: "Validates variants using ClinVar and gnomAD databases" },
  { id: "pathway_analyst", name: "Pathway Analyst", desc: "Performs molecular pathway enrichment analysis" },
  { id: "molecular_profiler", name: "Molecular Profiler", desc: "Profiles molecular interactions and expression" },
];

export const PRIVACY_OPS = [
  { id: "ols_normalize", name: "EBI OLS Normalization", desc: "Normalizes terminology to OLS ontologies" },
  { id: "narrative_redact", name: "Narrative Redaction", desc: "Redacts PHI identifiers from unstructured reports" },
  { id: "k_anonymity_check", name: "k-Anonymity Guard", desc: "Ensures cohort patient groups satisfy k-anonymity (k >= 5)" }
];
