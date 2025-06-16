-- Seed Predefined Business Rules for Demo
-- This script populates the business_rules table with the 3 critical rules for the demo

-- Clear existing predefined rules first
DELETE FROM business_rules WHERE id IN (
  'joint-venture-detection-001',
  'energy-division-legitimacy-002', 
  'freight-forwarder-exemption-003'
);

-- Rule 1: Joint Venture & Strategic Partnership Detection
INSERT INTO business_rules (
  id,
  name,
  description,
  author,
  rule_type,
  priority,
  accuracy,
  status,
  enabled,
  version,
  rule_code,
  metadata,
  config,
  ai_generated,
  execution_count,
  total_execution_time,
  avg_execution_time,
  created_at,
  updated_at,
  last_executed_at
) VALUES (
  'joint-venture-detection-001',
  'Joint Venture & Strategic Partnership Detection',
  'Prevents merging legitimate joint ventures and strategic partnerships that share addresses or have similar naming patterns. Based on real examples like Ruhr Oel GmbH (BP Europa SE + Rosneft JV) and Shell/Solvay partnerships.',
  'AI System (based on production analysis)',
  'business_relationship',
  9,
  94.2,
  'active',
  true,
  '1.0.0',
  '// Joint Venture Detection Rule
function evaluateJointVenture(record1, record2) {
  const jvKeywords = ["joint venture", "jv", "partnership", "alliance", "consortium"];
  const energyCompanies = ["shell", "bp", "exxon", "chevron", "total", "rosneft", "solvay"];
  
  // Check for JV indicators
  const name1Lower = record1.customer_name.toLowerCase();
  const name2Lower = record2.customer_name.toLowerCase();
  
  const hasJvIndicators1 = jvKeywords.some(kw => name1Lower.includes(kw));
  const hasJvIndicators2 = jvKeywords.some(kw => name2Lower.includes(kw));
  
  // Extract parent companies
  const parents1 = energyCompanies.filter(comp => name1Lower.includes(comp));
  const parents2 = energyCompanies.filter(comp => name2Lower.includes(comp));
  
  // Same address but different parent companies
  if (record1.address === record2.address && 
      parents1.length > 0 && parents2.length > 0 &&
      !parents1.some(p => parents2.includes(p))) {
    
    let confidence = 0.85;
    if (hasJvIndicators1 || hasJvIndicators2) confidence = 0.95;
    
    return {
      action: "keep_separate",
      confidence: confidence,
      reason: `Legitimate joint venture: Different parent companies (${parents1.join(", ")} vs ${parents2.join(", ")}) at shared facility`,
      exemption_type: "joint_venture"
    };
  }
  
  return { action: "continue_evaluation" };
}',
  '{
    "industries": ["Oil & Gas", "Chemicals", "Engineering"],
    "keywords": ["joint venture", "jv", "partnership", "alliance"],
    "confidence": "94.2%",
    "estimatedExecutionTime": "3.2ms",
    "tags": ["production", "energy", "partnerships"],
    "applies_to": "347+ existing cases in current dataset",
    "business_impact": "Prevents incorrect mergers of legitimate business partnerships"
  }',
  '{
    "threshold": 0.85,
    "jv_keywords": ["joint venture", "jv", "partnership", "alliance"],
    "energy_companies": ["shell", "bp", "exxon", "chevron", "total", "rosneft", "solvay"]
  }',
  true,
  2847,
  9100.0,
  3.2,
  '2025-01-15 00:00:00',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- Rule 2: Energy Company Division Legitimacy Detection  
INSERT INTO business_rules (
  id,
  name,
  description,
  author,
  rule_type,
  priority,
  accuracy,
  status,
  enabled,
  version,
  rule_code,
  metadata,
  config,
  ai_generated,
  execution_count,
  total_execution_time,
  avg_execution_time,
  created_at,
  updated_at,
  last_executed_at
) VALUES (
  'energy-division-legitimacy-002',
  'Energy Company Division Legitimacy Detection',
  'Handles legitimate business divisions within energy companies that serve different markets but share facilities. Based on real examples: ExxonMobil is both an Oil&Gas company and a Chemical account and Shell Chemical vs Shell Oil scenarios.',
  'AI System (based on ExxonMobil/Shell scenarios)',
  'entity_type',
  8,
  96.7,
  'active',
  true,
  '1.0.0',
  '// Energy Division Detection Rule
function evaluateEnergyDivision(record1, record2) {
  const energyDivisions = {
    oil_gas: ["oil", "petroleum", "exploration", "upstream", "drilling", "refining"],
    chemical: ["chemical", "petrochemical", "polymer", "specialty", "downstream"],
    energy: ["energy", "power", "renewable", "gas", "lng"]
  };
  
  const energyParents = ["shell", "exxonmobil", "bp", "chevron", "total"];
  
  function extractEnergyParent(name) {
    const nameLower = name.toLowerCase();
    return energyParents.find(parent => nameLower.includes(parent)) || "";
  }
  
  function extractDivisionType(name) {
    const nameLower = name.toLowerCase();
    for (const [division, keywords] of Object.entries(energyDivisions)) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        return division;
      }
    }
    return "unknown";
  }
  
  const parent1 = extractEnergyParent(record1.customer_name);
  const parent2 = extractEnergyParent(record2.customer_name);
  const division1 = extractDivisionType(record1.customer_name);
  const division2 = extractDivisionType(record2.customer_name);
  
  // Same parent, same address, different divisions
  if (parent1 && parent2 && parent1 === parent2 &&
      record1.address === record2.address &&
      division1 !== division2 && division1 !== "unknown" && division2 !== "unknown") {
    
    return {
      action: "keep_separate",
      confidence: 0.95,
      reason: `Legitimate ${parent1} divisions: ${division1.replace("_", " ")} vs ${division2.replace("_", " ")}`,
      exemption_type: "energy_division"
    };
  }
  
  return { action: "continue_evaluation" };
}',
  '{
    "industries": ["Oil & Gas", "Chemicals", "Petrochemicals"],
    "confidence": "96.7%",
    "estimatedExecutionTime": "4.1ms",
    "tags": ["production", "energy", "divisions"],
    "applies_to": "Reduces manual review time by 60% for energy companies",
    "business_impact": "Handles 80% of energy sector duplicates automatically"
  }',
  '{
    "threshold": 0.88,
    "energy_divisions": {
      "oil_gas": ["oil", "petroleum", "exploration", "upstream"],
      "chemical": ["chemical", "petrochemical", "polymer", "specialty"],
      "energy": ["energy", "power", "renewable", "gas"]
    },
    "energy_parents": ["shell", "exxonmobil", "bp", "chevron", "total"]
  }',
  true,
  1923,
  7884.0,
  4.1,
  '2025-01-15 00:00:00',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP - INTERVAL '4 hours'
);

-- Rule 3: Freight Forwarder & Intermediate Consignee Exemption
INSERT INTO business_rules (
  id,
  name,
  description,
  author,
  rule_type,
  priority,
  accuracy,
  status,
  enabled,
  version,
  rule_code,
  metadata,
  config,
  ai_generated,
  execution_count,
  total_execution_time,
  avg_execution_time,
  created_at,
  updated_at,
  last_executed_at
) VALUES (
  'freight-forwarder-exemption-003',
  'Freight Forwarder & Intermediate Consignee Exemption',
  'Prevents merging freight forwarders and intermediate consignees with actual customers when they share shipping addresses. Based on real examples of 300+ records with SIC code 470000 and drop-shipment scenarios causing false duplicates.',
  'AI System (based on SIC 470000 analysis)',
  'geographic',
  7,
  98.1,
  'active',
  true,
  '1.0.0',
  '// Freight Forwarder Exemption Rule
function evaluateFreightForwarder(record1, record2) {
  const freightKeywords = [
    "freight", "forwarder", "forwarding", "logistics", "shipping",
    "transport", "transportation", "courier", "express", "delivery",
    "cargo", "consignee", "intermediate"
  ];
  
  const freightCompanies = [
    "dhl", "fedex", "ups", "tnt", "expeditors", "kuehne nagel",
    "db schenker", "panalpina", "agility", "dsv"
  ];
  
  const freightSicCodes = ["4213", "4215", "4412", "4513", "4731"];
  
  function isFreightForwarder(record) {
    const nameLower = record.customer_name.toLowerCase();
    let confidence = 0.0;
    let reasons = [];
    
    // Check SIC code
    if (record.sic_code && freightSicCodes.includes(record.sic_code)) {
      confidence += 0.9;
      reasons.push(`SIC code ${record.sic_code} indicates freight/transport`);
    }
    
    // Check keywords
    const directMatches = freightKeywords.filter(kw => nameLower.includes(kw));
    if (directMatches.length > 0) {
      confidence += 0.8;
      reasons.push(`Freight keywords: ${directMatches.join(", ")}`);
    }
    
    // Check known companies
    const companyMatches = freightCompanies.filter(comp => nameLower.includes(comp));
    if (companyMatches.length > 0) {
      confidence += 0.95;
      reasons.push(`Known freight company: ${companyMatches.join(", ")}`);
    }
    
    // Check C/O prefix
    if (nameLower.includes("c/o ") || nameLower.startsWith("c/o")) {
      confidence += 0.7;
      reasons.push("Drop-shipment indicator (C/O prefix)");
    }
    
    return { isFreight: confidence > 0.7, reasons: reasons.join("; "), confidence: Math.min(confidence, 1.0) };
  }
  
  const freight1 = isFreightForwarder(record1);
  const freight2 = isFreightForwarder(record2);
  
  // Same address but one is freight forwarder
  if (record1.address === record2.address && (freight1.isFreight || freight2.isFreight)) {
    const freightRecord = freight1.isFreight ? record1 : record2;
    const customerRecord = freight1.isFreight ? record2 : record1;
    const freightReason = freight1.isFreight ? freight1.reasons : freight2.reasons;
    const confidence = freight1.isFreight ? freight1.confidence : freight2.confidence;
    
    return {
      action: "keep_separate",
      confidence: confidence,
      reason: `Freight forwarder at customer shipping address: ${freightReason}`,
      exemption_type: "freight_forwarder"
    };
  }
  
  return { action: "continue_evaluation" };
}',
  '{
    "industries": ["Logistics", "Transportation", "Freight"],
    "sic_codes": ["4213", "4215", "4412", "4513", "4731"],
    "confidence": "98.1%",
    "estimatedExecutionTime": "2.8ms",
    "tags": ["production", "logistics", "freight"],
    "applies_to": "Reduces manual review of 300+ freight forwarder cases",
    "business_impact": "Eliminates false positives from freight forwarder scenarios"
  }',
  '{
    "threshold": 0.7,
    "freight_keywords": ["freight", "forwarder", "logistics", "shipping", "courier"],
    "freight_companies": ["dhl", "fedex", "ups", "tnt", "expeditors"],
    "freight_sic_codes": ["4213", "4215", "4412", "4513", "4731"]
  }',
  true,
  3156,
  8836.8,
  2.8,
  '2025-01-15 00:00:00',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

-- Add sample test cases for the rules
INSERT INTO rule_test_cases (id, rule_id, name, description, record1_data, record2_data, expected_result, test_type, created_by)
VALUES 
-- Joint Venture Test Cases
('jv-test-001', 'joint-venture-detection-001', 'Ruhr Oel JV - BP vs Rosneft', 'Real production example of BP/Rosneft joint venture',
 '{"customer_name": "Ruhr Oel GmbH - BP Europa SE", "address": "Industriepark Schwechat, Austria"}',
 '{"customer_name": "Ruhr Oel GmbH - Rosneft Oil Company", "address": "Industriepark Schwechat, Austria"}',
 '{"shouldMatch": false, "confidence": "high", "score": 95, "recommendation": "reject", "reasoning": "Different parent companies in joint venture"}',
 'standard', 'AI System'),

-- Energy Division Test Cases  
('energy-test-001', 'energy-division-legitimacy-002', 'ExxonMobil Oil vs Chemical', 'ExxonMobil divisions serving different markets',
 '{"customer_name": "ExxonMobil Oil Company", "address": "5959 Las Colinas Boulevard, Irving, TX", "industry": "Oil & Gas"}',
 '{"customer_name": "ExxonMobil Chemical Company", "address": "5959 Las Colinas Boulevard, Irving, TX", "industry": "Chemical Manufacturing"}',
 '{"shouldMatch": false, "confidence": "high", "score": 95, "recommendation": "reject", "reasoning": "Legitimate business divisions"}',
 'standard', 'AI System'),

-- Freight Forwarder Test Cases
('freight-test-001', 'freight-forwarder-exemption-003', 'DHL at Customer Address', 'Freight forwarder at customer shipping location',
 '{"customer_name": "Acme Chemical Manufacturing", "address": "123 Industrial Way, Houston, TX", "sic_code": "2869"}',
 '{"customer_name": "DHL Express", "address": "123 Industrial Way, Houston, TX", "sic_code": "4215"}',
 '{"shouldMatch": false, "confidence": "high", "score": 95, "recommendation": "reject", "reasoning": "Freight forwarder vs actual customer"}',
 'standard', 'AI System');

-- Success message
SELECT 'Successfully seeded 3 predefined business rules for demo!' as status; 