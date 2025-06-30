export interface DirectGeminiResponse {
  summary: string;
  extractedContent: string;
  analysis: string;
  documentType: string;
  keyFindings: string[];
}

export class DirectGeminiUpload {
  private genAI: any;
  private model: any;
  private visionModel: any;
  private isInitialized = false;

  constructor() {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️ Gemini API key not configured');
      return;
    }

    try {
      // Dynamic import to avoid build issues
      import('@google/generative-ai').then(({ GoogleGenerativeAI }) => {
        this.genAI = new GoogleGenerativeAI(geminiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        this.visionModel = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        this.isInitialized = true;
        console.log('✅ UNIVERSAL STRUCTURED FILE ANALYSIS with TABLE DETECTION initialized');
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Failed to initialize Structured File Analysis:', error.message);
      } else {
        console.error('❌ Failed to initialize Structured File Analysis:', error);
      }
    }
  }

  async uploadAndAnalyze(file: File): Promise<DirectGeminiResponse> {
    if (!this.isInitialized) {
      throw new Error('File analysis not initialized. Please check your API key.');
    }

    console.log(`🚀 UNIVERSAL STRUCTURED EXTRACTION with TABLE DETECTION of ${file.name}`);

    try {
      let analysis = '';
      
      if (file.type === 'application/pdf') {
        analysis = await this.universalPDFAnalysis(file);
      } else if (file.type.startsWith('image/')) {
        analysis = await this.universalImageAnalysis(file);
      } else if (this.isTextFile(file)) {
        analysis = await this.universalTextAnalysis(file);
      } else {
        analysis = await this.universalBinaryAnalysis(file);
      }

      // Extract document type and key findings from the STRUCTURED analysis
      const documentType = this.extractDocumentType(analysis);
      const keyFindings = this.extractKeyFindings(analysis);

      return {
        summary: analysis,
        extractedContent: analysis,
        analysis: analysis,
        documentType,
        keyFindings
      };
    } catch (error) {
      console.error('💥 Universal structured file analysis failed:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to analyze file: ${error.message}`);
      } else {
        throw new Error(`Failed to analyze file: ${String(error)}`);
      }
    }
  }

  private async universalPDFAnalysis(file: File): Promise<string> {
    console.log('📄 UNIVERSAL PDF ANALYSIS with TABLE DETECTION - Extract ALL content with perfect structure');
    
    const base64Data = await this.fileToBase64(file);
    
    const prompt = `
You are Honig's UNIVERSAL Document Analysis System with ADVANCED TABLE DETECTION. Your mission is to extract ALL real content and structure it with PERFECT formatting.

**CRITICAL REQUIREMENTS:**
1. **EXTRACT EVERY SINGLE PIECE OF CONTENT** from this PDF
2. **STRUCTURE EVERYTHING BEAUTIFULLY** with perfect formatting
3. **DETECT AND FORMAT ALL TABLES** - If you see tabular data, present it in proper table format
4. **NO UNSTRUCTURED TEXT** - Everything must be properly organized
5. **COMPREHENSIVE ANALYSIS** - Miss nothing, format everything perfectly

**SPECIAL TABLE DETECTION INSTRUCTIONS:**
- **SCAN FOR TABLES:** Look for any data arranged in rows and columns
- **FORMAT AS TABLES:** Use proper markdown table format with | separators
- **INCLUDE ALL DATA:** Extract every cell value accurately
- **PRESERVE STRUCTURE:** Maintain original table organization
- **LABEL TABLES:** Give each table a descriptive title

**MANDATORY UNIVERSAL STRUCTURED OUTPUT FORMAT:**

# 📄 **COMPLETE DOCUMENT ANALYSIS: ${file.name}**

## 🔍 **Document Overview**
• **Title:** [Extract the exact main title]
• **Organization:** [Company/Institution name]
• **Document Type:** [Sample Questions, Tutorial, Manual, Report, etc.]
• **Total Pages:** [Number if visible]
• **Copyright:** [Copyright information if present]
• **Contact Info:** [Email, website, phone if present]

---

## 📚 **ALL CONTENT EXTRACTED (Organized by Sections)**

### **Section 1: [First Major Section Title]**

#### **Content:**
[All content from this section, properly formatted with bullet points]

#### **Key Points:**
• [Important point 1]
• [Important point 2]
• [Important point 3]

#### **Details:**
• [Specific detail 1]
• [Specific detail 2]
• [Specific detail 3]

---

### **Section 2: [Second Major Section Title]**

#### **Content:**
[All content from this section]

#### **Key Points:**
• [Important point 1]
• [Important point 2]
• [Important point 3]

---

[Continue this pattern for ALL sections found]

---

## 📊 **ALL TABLES DETECTED AND FORMATTED**

### **Table 1: [Descriptive Table Title]**

| Column 1 Header | Column 2 Header | Column 3 Header | Column 4 Header |
|-----------------|-----------------|-----------------|-----------------|
| [Data Cell 1,1] | [Data Cell 1,2] | [Data Cell 1,3] | [Data Cell 1,4] |
| [Data Cell 2,1] | [Data Cell 2,2] | [Data Cell 2,3] | [Data Cell 2,4] |
| [Data Cell 3,1] | [Data Cell 3,2] | [Data Cell 3,3] | [Data Cell 3,4] |

**Table Description:** [What this table shows and its purpose]

---

### **Table 2: [Descriptive Table Title]**

| Header A | Header B | Header C |
|----------|----------|----------|
| [Value]  | [Value]  | [Value]  |
| [Value]  | [Value]  | [Value]  |

**Table Description:** [What this table shows and its purpose]

---

[Continue for ALL tables found in the document]

---

## ❓ **ALL QUESTIONS/PROBLEMS FOUND**

### **Question 1: [Extract exact title/description]**

#### **Problem Statement:**
[Complete problem description exactly as written]

#### **Input Format:**
• **Parameter 1:** [Description and constraints]
• **Parameter 2:** [Description and constraints]
• **Parameter 3:** [Description and constraints]

#### **Output Format:**
[Expected output description]

#### **Example Cases:**
**Case 1:**
• **Input:** [Exact input values]
• **Output:** [Exact output values]
• **Explanation:** [How the solution works]

**Case 2:**
• **Input:** [Exact input values]
• **Output:** [Exact output values]
• **Explanation:** [How the solution works]

#### **Constraints:**
• [Constraint 1]
• [Constraint 2]
• [Constraint 3]

---

### **Question 2: [Extract exact title/description]**
[Follow same format as Question 1]

---

[Continue for ALL questions found]

---

## 📊 **COMPLETE DATA EXTRACTION**

### **Numbers and Statistics:**
• [All numbers, percentages, dates found]
• [Statistics or data points]
• [Measurements, scores, etc.]

### **Lists and Bullet Points:**
• [Every bullet point or list item found]
• [Organized exactly as they appear]
• [With proper indentation if nested]

### **Charts and Graphs:**
• [Description of any charts found]
• [Data from charts if readable]
• [Chart descriptions and data]

---

## 💻 **CODE/TECHNICAL CONTENT (if any)**

### **Code Blocks Found:**
\`\`\`
[Any code, formulas, or technical content visible]
\`\`\`

### **Technical Terms:**
• [Technical term 1]: [Definition/context]
• [Technical term 2]: [Definition/context]
• [Technical term 3]: [Definition/context]

---

## 📞 **CONTACT & REFERENCE INFORMATION**

### **Contact Details:**
• **Email:** [If found]
• **Phone:** [If found]
• **Website:** [If found]
• **Address:** [If found]

### **References:**
• [Any references or citations found]
• [External links or resources mentioned]
• [Related documents mentioned]

---

## 📋 **DOCUMENT STATISTICS**
• **Total Questions:** [Exact number]
• **Total Sections:** [Number of major sections]
• **Total Tables:** [Number of tables found and formatted]
• **Question Types:** [List all types found]
• **Difficulty Levels:** [If mentioned]
• **Programming Languages:** [If specified]
• **Page Count:** [If determinable]

## 🎯 **KEY INFORMATION SUMMARY**
• **Primary Purpose:** [What this document is for]
• **Target Audience:** [Who should use this]
• **Main Topics:** [Core subjects covered]
• **Competition/Event:** [If applicable]
• **Instructions:** [Any usage instructions found]

## 💡 **COMPLETE DOCUMENT ASSESSMENT**
[Comprehensive summary of what this document contains, its purpose, how it should be used, and any important notes about the content]

**CRITICAL SUCCESS CRITERIA:**
✅ Extract EVERY question completely with ALL example cases
✅ Include ALL constraints and parameters with exact values
✅ DETECT AND FORMAT ALL TABLES with proper markdown table syntax
✅ List ALL sections with complete content
✅ Structure everything with perfect formatting using bullet points
✅ Separate each major section clearly with dividers
✅ Miss absolutely NOTHING from the original document
✅ Organize content logically and beautifully

**SPECIAL TABLE FORMATTING REQUIREMENTS:**
✅ Use proper markdown table format: | Column | Column | Column |
✅ Include table headers with proper alignment
✅ Extract ALL data from every cell accurately
✅ Give each table a descriptive title
✅ Provide table descriptions explaining their purpose
✅ Maintain original table structure and organization

**REMEMBER:** This must be a complete, perfectly structured extraction of ALL content in the PDF. No shortcuts, no summaries - extract everything with beautiful formatting, comprehensive organization, and proper table formatting for any tabular data found.
`;

    const imagePart = {
      inlineData: {
        data: base64Data.split(',')[1],
        mimeType: file.type
      }
    };

    const result = await this.visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  }

  private async universalImageAnalysis(file: File): Promise<string> {
    console.log('🖼️ UNIVERSAL IMAGE ANALYSIS with TABLE DETECTION - Complete OCR with perfect structure');
    
    const base64Data = await this.fileToBase64(file);
    
    const prompt = `
You are Honig's UNIVERSAL Image Analysis System with ADVANCED TABLE DETECTION. Extract ALL visible text and structure it with PERFECT formatting.

**CRITICAL REQUIREMENTS:**
1. **READ EVERY VISIBLE CHARACTER** using advanced OCR
2. **STRUCTURE EVERYTHING PERFECTLY** with beautiful formatting
3. **DETECT AND FORMAT ALL TABLES** - If you see tabular data, present it in proper table format
4. **ORGANIZE BY LOGICAL SECTIONS** - group related content together
5. **MISS NOTHING** - extract every piece of visible text and visual element

**SPECIAL TABLE DETECTION INSTRUCTIONS:**
- **SCAN FOR TABLES:** Look for any data arranged in rows and columns
- **FORMAT AS TABLES:** Use proper markdown table format with | separators
- **INCLUDE ALL DATA:** Extract every cell value accurately
- **PRESERVE STRUCTURE:** Maintain original table organization
- **LABEL TABLES:** Give each table a descriptive title

**MANDATORY UNIVERSAL STRUCTURED OUTPUT FORMAT:**

# 🖼️ **COMPLETE IMAGE ANALYSIS: ${file.name}**

## 🔍 **Image Properties & Overview**
• **Image Type:** [Screenshot, document photo, diagram, chart, etc.]
• **Quality Assessment:** [Excellent, good, fair, poor]
• **Orientation:** [Portrait, landscape, rotated]
• **Text Clarity:** [Crystal clear, readable, challenging, poor]
• **Content Type:** [Document, code, diagram, mixed, etc.]

---

## 📝 **ALL TEXT CONTENT (Organized by Sections)**

### **Main Headings & Titles**
• **Primary Title:** [Largest heading found]
• **Subtitle 1:** [Secondary heading]
• **Subtitle 2:** [Another secondary heading]
• **Section Headers:** [All other headers found]

---

### **Section 1: [Name of first logical section]**

#### **Complete Text Content:**
[All text content from this section, organized paragraph by paragraph]

#### **Key Points Extracted:**
• [Important point 1]
• [Important point 2]
• [Important point 3]

#### **Specific Details:**
• [Detail 1]
• [Detail 2]
• [Detail 3]

---

### **Section 2: [Name of second logical section]**

#### **Complete Text Content:**
[All text content from this section]

#### **Key Points Extracted:**
• [Important point 1]
• [Important point 2]
• [Important point 3]

---

[Continue for ALL logical sections found]

---

## 📊 **ALL TABLES DETECTED AND FORMATTED**

### **Table 1: [Descriptive Table Title]**

| Column 1 Header | Column 2 Header | Column 3 Header | Column 4 Header |
|-----------------|-----------------|-----------------|-----------------|
| [Data Cell 1,1] | [Data Cell 1,2] | [Data Cell 1,3] | [Data Cell 1,4] |
| [Data Cell 2,1] | [Data Cell 2,2] | [Data Cell 2,3] | [Data Cell 2,4] |
| [Data Cell 3,1] | [Data Cell 3,2] | [Data Cell 3,3] | [Data Cell 3,4] |

**Table Description:** [What this table shows and its purpose]

---

### **Table 2: [Descriptive Table Title]**

| Header A | Header B | Header C |
|----------|----------|----------|
| [Value]  | [Value]  | [Value]  |
| [Value]  | [Value]  | [Value]  |

**Table Description:** [What this table shows and its purpose]

---

[Continue for ALL tables found in the image]

---

## 📋 **ALL LISTS & BULLET POINTS**

### **List 1: [List title/context]**
• [Every bullet point or list item found]
• [Organized exactly as they appear]
• [With proper indentation if nested]

### **List 2: [List title/context]**
• [Continue for all lists found]
• [Maintain original structure]

---

## 🔢 **ALL NUMBERS, DATA & STATISTICS**
• **Dates:** [All dates found]
• **Numbers:** [All numerical values]
• **Percentages:** [Any percentages]
• **Statistics:** [Data points or statistics]
• **Measurements:** [Sizes, dimensions, etc.]
• **Contact Info:** [Phone numbers, addresses, etc.]

---

## ❓ **QUESTIONS & PROBLEMS (if any)**

### **Question 1:** [Exact question text]
• **Context:** [Where it appears]
• **Answer:** [If visible]
• **Options:** [If multiple choice]

### **Question 2:** [Exact question text]
• **Context:** [Where it appears]
• **Answer:** [If visible]

[Continue for all questions found]

---

## 💻 **CODE & TECHNICAL CONTENT (if any)**

### **Code Blocks Found:**
\`\`\`
[Any code, formulas, or technical content visible]
\`\`\`

### **Technical Terms:**
• [Technical term 1]: [Context where found]
• [Technical term 2]: [Context where found]

### **Formulas/Equations:**
• [Mathematical formulas if present]
• [Scientific equations if present]

---

## 📞 **CONTACT & REFERENCE INFO**
• **Email Addresses:** [All emails found]
• **Phone Numbers:** [All phone numbers]
• **Websites/URLs:** [All web addresses]
• **Physical Addresses:** [Any addresses]
• **Social Media:** [Any social handles]

---

## 🎨 **VISUAL ELEMENTS DESCRIPTION**

### **Layout & Design:**
• **Overall Layout:** [Description of page layout]
• **Color Scheme:** [Dominant colors used]
• **Typography:** [Font styles observed]
• **Branding:** [Logos, brand elements]

### **Images & Graphics:**
• **Photos:** [Description of any photos]
• **Diagrams:** [Charts, graphs, diagrams]
• **Icons:** [Any icons or symbols]
• **Illustrations:** [Any drawings or illustrations]

---

## 📊 **OCR ANALYSIS SUMMARY**
• **Total Text Blocks:** [Number of distinct text areas]
• **Total Tables:** [Number of tables detected and formatted]
• **Readability Score:** [How clear the text is - 1-10]
• **Language Detected:** [Primary language]
• **Text Density:** [High, medium, low]
• **OCR Confidence:** [How confident in the extraction]

## 🎯 **KEY INFORMATION EXTRACTED**
• [Most important finding 1]
• [Most important finding 2]
• [Most important finding 3]
• [Most important finding 4]
• [Most important finding 5]

## 💡 **COMPLETE IMAGE CONTENT ASSESSMENT**
[Comprehensive description of everything visible in the image, its purpose, what it's trying to communicate, and how it should be understood or used]

**CRITICAL SUCCESS CRITERIA:**
✅ Extract EVERY visible character with perfect accuracy
✅ DETECT AND FORMAT ALL TABLES with proper markdown table syntax
✅ Organize all text by logical sections with clear structure
✅ Include ALL numbers, dates, and data points
✅ Describe ALL visual elements comprehensively
✅ Structure with perfect formatting using bullet points
✅ Use clear headings and subheadings for organization
✅ Miss absolutely NOTHING visible in the image

**SPECIAL TABLE FORMATTING REQUIREMENTS:**
✅ Use proper markdown table format: | Column | Column | Column |
✅ Include table headers with proper alignment
✅ Extract ALL data from every cell accurately
✅ Give each table a descriptive title
✅ Provide table descriptions explaining their purpose
✅ Maintain original table structure and organization

**REMEMBER:** This must be a complete OCR extraction with perfect organization, beautiful formatting, and proper table formatting for any tabular data found. Read everything visible and structure it comprehensively.
`;

    const imagePart = {
      inlineData: {
        data: base64Data.split(',')[1],
        mimeType: file.type
      }
    };

    const result = await this.visionModel.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  }

  private async universalTextAnalysis(file: File): Promise<string> {
    console.log('📄 UNIVERSAL TEXT ANALYSIS with TABLE DETECTION - Complete file analysis with perfect structure');
    
    const textContent = await this.extractTextFromFile(file);
    
    const prompt = `
You are Honig's UNIVERSAL Text File Analysis System with ADVANCED TABLE DETECTION. Analyze ALL content and structure it with PERFECT formatting.

**ACTUAL FILE CONTENT:**
${textContent}

**CRITICAL REQUIREMENTS:**
1. **ANALYZE EVERY LINE** of the file content comprehensively
2. **STRUCTURE EVERYTHING PERFECTLY** with beautiful formatting
3. **DETECT AND FORMAT ALL TABLES** - If you see tabular data, present it in proper table format
4. **ORGANIZE BY LOGICAL SECTIONS** - group related content intelligently
5. **COMPREHENSIVE ANALYSIS** - miss nothing, format everything perfectly

**SPECIAL TABLE DETECTION INSTRUCTIONS:**
- **SCAN FOR TABLES:** Look for any data arranged in rows and columns
- **FORMAT AS TABLES:** Use proper markdown table format with | separators
- **INCLUDE ALL DATA:** Extract every cell value accurately
- **PRESERVE STRUCTURE:** Maintain original table organization
- **LABEL TABLES:** Give each table a descriptive title

**MANDATORY UNIVERSAL STRUCTURED OUTPUT FORMAT:**

# 📄 **COMPLETE TEXT FILE ANALYSIS: ${file.name}**

## 🔍 **File Properties & Overview**
• **File Name:** ${file.name}
• **File Type:** [Programming file, document, data file, configuration, etc.]
• **File Size:** ${this.formatFileSize(file.size)}
• **Language/Format:** [Programming language, markup, data format, etc.]
• **Total Lines:** [Approximate number of lines]
• **Character Count:** [Approximate characters]
• **Encoding:** [UTF-8, ASCII, etc. if determinable]

---

## 📝 **COMPLETE CONTENT STRUCTURE**

### **Section 1: [First logical section name]**

#### **Content:**
[All content from this section, properly formatted]

#### **Key Elements:**
• [Important element 1]
• [Important element 2]
• [Important element 3]

#### **Details:**
• [Specific detail 1]
• [Specific detail 2]

---

### **Section 2: [Second logical section name]**

#### **Content:**
[All content from this section]

#### **Key Elements:**
• [Important element 1]
• [Important element 2]

---

[Continue for ALL logical sections found]

---

## 📊 **ALL TABLES DETECTED AND FORMATTED**

### **Table 1: [Descriptive Table Title]**

| Column 1 Header | Column 2 Header | Column 3 Header | Column 4 Header |
|-----------------|-----------------|-----------------|-----------------|
| [Data Cell 1,1] | [Data Cell 1,2] | [Data Cell 1,3] | [Data Cell 1,4] |
| [Data Cell 2,1] | [Data Cell 2,2] | [Data Cell 2,3] | [Data Cell 2,4] |
| [Data Cell 3,1] | [Data Cell 3,2] | [Data Cell 3,3] | [Data Cell 3,4] |

**Table Description:** [What this table shows and its purpose]

---

### **Table 2: [Descriptive Table Title]**

| Header A | Header B | Header C |
|----------|----------|----------|
| [Value]  | [Value]  | [Value]  |
| [Value]  | [Value]  | [Value]  |

**Table Description:** [What this table shows and its purpose]

---

[Continue for ALL tables found in the file]

---

## 💻 **CODE ANALYSIS (if applicable)**

### **Programming Language:** [Language identified]

### **Functions Found:**
• **Function 1:** \`function_name()\`
  - **Purpose:** [What it does]
  - **Parameters:** [Input parameters]
  - **Returns:** [Return value/type]
  
• **Function 2:** \`function_name()\`
  - **Purpose:** [What it does]
  - **Parameters:** [Input parameters]
  - **Returns:** [Return value/type]

### **Classes Found:**
• **Class 1:** \`ClassName\`
  - **Purpose:** [What it represents]
  - **Methods:** [Key methods]
  - **Properties:** [Key properties]

### **Variables/Constants:**
• **Variable 1:** \`var_name\` - [Type and purpose]
• **Variable 2:** \`var_name\` - [Type and purpose]
• **Constant 1:** \`CONST_NAME\` - [Value and purpose]

### **Imports/Dependencies:**
• \`import_statement_1\` - [Purpose]
• \`import_statement_2\` - [Purpose]
• \`import_statement_3\` - [Purpose]

### **Main Code Blocks:**
\`\`\`${this.getFileExtension(file.name).substring(1)}
[Show the most important code sections with proper formatting]
\`\`\`

### **Code Structure:**
• **Entry Point:** [Main function or starting point]
• **Core Logic:** [Main algorithmic sections]
• **Helper Functions:** [Supporting functions]
• **Error Handling:** [How errors are managed]

---

## 📊 **DATA ANALYSIS (if applicable)**

### **Data Format:** [JSON, CSV, XML, YAML, etc.]

### **Structure Analysis:**
• **Records/Entries:** [Number of data records]
• **Fields/Columns:** [List all fields found]
• **Data Types:** [Types of data in each field]
• **Relationships:** [How data relates to each other]

### **Sample Data Structure:**
\`\`\`
[Show example of the data structure with proper formatting]
\`\`\`

### **Data Quality:**
• **Completeness:** [How complete the data is]
• **Consistency:** [Data consistency assessment]
• **Validation:** [Any validation rules present]

---

## 📋 **CONFIGURATION ANALYSIS (if applicable)**

### **Configuration Type:** [Application config, system config, etc.]

### **Settings Found:**
• **Setting 1:** \`setting_name\` = [value] - [Purpose]
• **Setting 2:** \`setting_name\` = [value] - [Purpose]
• **Setting 3:** \`setting_name\` = [value] - [Purpose]

### **Environment Variables:**
• [List any environment variables referenced]

### **Dependencies/Requirements:**
• [Any dependencies or requirements specified]

---

## ❓ **QUESTIONS/PROBLEMS/TODOS (if any)**

### **Questions Found:**
1. **Question 1:** [Extract any questions in comments or documentation]
2. **Question 2:** [Continue for all found]

### **TODO Items:**
• [TODO item 1]
• [TODO item 2]
• [TODO item 3]

### **Known Issues:**
• [Any bugs or issues mentioned]
• [Limitations noted]

---

## 🔧 **TECHNICAL ASSESSMENT**

### **Code Quality Metrics:**
• **Complexity Level:** [Simple, moderate, complex, very complex]
• **Code Style:** [Consistent, inconsistent, follows standards]
• **Documentation:** [Excellent, good, minimal, none]
• **Best Practices:** [Follows, partially follows, needs improvement]
• **Maintainability:** [High, medium, low]

### **Security Considerations:**
• [Any security-related code or concerns]
• [Input validation present]
• [Authentication/authorization elements]

### **Performance Considerations:**
• [Any performance-critical sections]
• [Optimization opportunities]
• [Resource usage patterns]

---

## 📊 **CONTENT STATISTICS**
• **Total Functions:** [Number]
• **Total Classes:** [Number]
• **Total Variables:** [Number]
• **Total Tables:** [Number of tables detected and formatted]
• **Comment Density:** [High, medium, low]
• **Code-to-Comment Ratio:** [Ratio if applicable]

## 🎯 **KEY INFORMATION EXTRACTED**
• [Most important finding 1]
• [Most important finding 2]
• [Most important finding 3]
• [Most important finding 4]
• [Most important finding 5]

## 💡 **COMPLETE FILE ASSESSMENT**
[Comprehensive analysis of the file's content, purpose, quality, functionality, how it should be used, potential improvements, and its role in a larger system or project]

**CRITICAL SUCCESS CRITERIA:**
✅ Analyze EVERY line of content comprehensively
✅ DETECT AND FORMAT ALL TABLES with proper markdown table syntax
✅ Extract ALL functions, classes, variables with details
✅ Include ALL imports, dependencies, and configurations
✅ Show actual code examples with proper formatting
✅ Structure with perfect formatting using bullet points
✅ Provide comprehensive technical assessment
✅ Miss absolutely NOTHING from the file content

**SPECIAL TABLE FORMATTING REQUIREMENTS:**
✅ Use proper markdown table format: | Column | Column | Column |
✅ Include table headers with proper alignment
✅ Extract ALL data from every cell accurately
✅ Give each table a descriptive title
✅ Provide table descriptions explaining their purpose
✅ Maintain original table structure and organization

**REMEMBER:** This must be a complete analysis of the entire file with perfect organization, beautiful formatting, comprehensive technical insights, and proper table formatting for any tabular data found.
`;

    const result = await this.model.generateContent([prompt]);
    const response = await result.response;
    return response.text();
  }

  private async universalBinaryAnalysis(file: File): Promise<string> {
    console.log('📁 UNIVERSAL BINARY ANALYSIS - Complete file properties with perfect structure');
    
    const prompt = `
You are Honig's UNIVERSAL Binary File Analysis System. Analyze ALL file properties and structure with PERFECT formatting.

**ACTUAL FILE INFORMATION:**
- **Name:** ${file.name}
- **Type:** ${file.type}
- **Size:** ${this.formatFileSize(file.size)}
- **Extension:** ${this.getFileExtension(file.name)}

**CRITICAL REQUIREMENTS:**
1. **ANALYZE ALL FILE PROPERTIES** comprehensively
2. **STRUCTURE EVERYTHING PERFECTLY** with beautiful formatting
3. **PROVIDE COMPLETE GUIDANCE** on working with this file type
4. **COMPREHENSIVE RECOMMENDATIONS** for usage and conversion

**MANDATORY UNIVERSAL STRUCTURED OUTPUT FORMAT:**

# 📁 **COMPLETE BINARY FILE ANALYSIS: ${file.name}**

## 🔍 **Complete File Properties**

### **Basic Information**
• **File Name:** ${file.name}
• **MIME Type:** ${file.type}
• **File Size:** ${this.formatFileSize(file.size)}
• **Extension:** ${this.getFileExtension(file.name)}
• **Analysis Date:** [Current timestamp]

### **File Classification**
• **Primary Category:** [Document, Media, Archive, Executable, Data, etc.]
• **Subcategory:** [Specific format classification]
• **Format Version:** [Format version if determinable]
• **Industry Standard:** [Standard it follows]

---

## 📋 **TECHNICAL SPECIFICATIONS**

### **Format Details**
• **Binary Format:** [Yes/No with technical details]
• **Compression:** [Type of compression used, if any]
• **Encoding:** [Character encoding or data encoding]
• **Endianness:** [Big-endian, little-endian, if applicable]
• **Header Structure:** [Information about file headers]

### **Metadata Support**
• **Embedded Metadata:** [What metadata this format can store]
• **Thumbnail Support:** [Whether it supports thumbnails]
• **Version History:** [If it supports version tracking]

---

## 💻 **SOFTWARE COMPATIBILITY**

### **Primary Applications**
• **Best Software:** [Main application for opening this file]
  - **Platform:** [Windows, Mac, Linux, Web]
  - **Cost:** [Free, Paid, Subscription]
  - **Features:** [Key features for this file type]

• **Alternative 1:** [Second best option]
  - **Platform:** [Compatibility]
  - **Cost:** [Pricing model]
  - **Features:** [What it offers]

• **Alternative 2:** [Third option]
  - **Platform:** [Compatibility]
  - **Cost:** [Pricing model]
  - **Features:** [What it offers]

### **Free & Open Source Options**
• **Free Option 1:** [Name and description]
• **Free Option 2:** [Name and description]
• **Open Source Option:** [Name and description]

### **Operating System Support**
• **Windows:** [Compatibility level and requirements]
• **macOS:** [Compatibility level and requirements]
• **Linux:** [Compatibility level and requirements]
• **iOS:** [Mobile support status]
• **Android:** [Mobile support status]

### **Online Tools & Services**
• **Web Viewer 1:** [Online tool for viewing]
• **Web Converter 1:** [Online conversion tool]
• **Web Editor 1:** [Online editing tool]
• **Cloud Service:** [Cloud-based solutions]

---

## 📊 **COMPATIBILITY MATRIX**

### **Platform Compatibility Table**

| Platform | Native Support | Third-Party Tools | Online Tools | Recommendation |
|----------|---------------|-------------------|--------------|----------------|
| Windows  | [Status]      | [Available Tools] | [Web Options]| [Best Choice]  |
| macOS    | [Status]      | [Available Tools] | [Web Options]| [Best Choice]  |
| Linux    | [Status]      | [Available Tools] | [Web Options]| [Best Choice]  |
| Mobile   | [Status]      | [Available Apps]  | [Web Options]| [Best Choice]  |

---

## 🔄 **CONVERSION & COMPATIBILITY**

### **Recommended Conversions**
• **Convert To:** [Best alternative format]
  - **Why:** [Reason for this conversion]
  - **Tools:** [Software for conversion]
  - **Quality Loss:** [None, minimal, significant]
  
• **Convert To:** [Second alternative format]
  - **Why:** [Reason for this conversion]
  - **Tools:** [Software for conversion]
  - **Quality Loss:** [Assessment]

### **Conversion Tools**
• **Free Tool 1:** [Name, features, limitations]
• **Free Tool 2:** [Name, features, limitations]
• **Professional Tool:** [Paid option with advanced features]
• **Batch Converter:** [For multiple files]

### **Format Migration Path**
• **Legacy Support:** [How long this format will be supported]
• **Future-Proofing:** [Recommended migration strategy]
• **Archive Strategy:** [Best practices for long-term storage]

---

## 🛡️ **SECURITY & SAFETY**

### **Security Assessment**
• **Risk Level:** [Low, Medium, High with explanation]
• **Potential Threats:** [Specific security concerns]
• **Safe Handling:** [How to handle safely]
• **Virus Scanning:** [Recommended security measures]

### **Privacy Considerations**
• **Metadata Exposure:** [What personal data might be embedded]
• **Tracking Concerns:** [Any privacy implications]
• **Data Sanitization:** [How to clean metadata]

### **Best Security Practices**
• [Security recommendation 1]
• [Security recommendation 2]
• [Security recommendation 3]

---

## 🎯 **USAGE RECOMMENDATIONS**

### **Best Practices for This File Type**
• **Storage:** [Optimal storage recommendations]
• **Backup:** [Backup strategy recommendations]
• **Sharing:** [Best practices for sharing]
• **Organization:** [File organization tips]

### **Common Use Cases**
• **Use Case 1:** [Detailed description]
• **Use Case 2:** [Detailed description]
• **Use Case 3:** [Detailed description]

### **Workflow Integration**
• **Collaboration:** [How to work with others]
• **Version Control:** [Version management strategies]
• **Automation:** [Automation possibilities]

### **Performance Optimization**
• **File Size:** [Optimization strategies]
• **Loading Speed:** [Performance considerations]
• **Resource Usage:** [System resource requirements]

---

## 📊 **ACCESSIBILITY & COMPATIBILITY**

### **Accessibility Scores**
• **Ease of Opening:** [1-10 rating with detailed explanation]
• **Cross-Platform:** [How well it works across systems]
• **Future-Proof:** [Long-term accessibility assessment]
• **Standard Compliance:** [Adherence to industry standards]

---

## 🔧 **TECHNICAL RECOMMENDATIONS**

### **Development Considerations**
• **API Support:** [Programming interfaces available]
• **Library Support:** [Programming libraries for this format]
• **Documentation:** [Quality of technical documentation]

### **Integration Options**
• **Database Storage:** [How to store in databases]
• **Web Integration:** [Web-based handling options]
• **Mobile Apps:** [Mobile development considerations]

---

## 📈 **INDUSTRY INSIGHTS**

### **Market Position**
• **Popularity:** [How widely used this format is]
• **Industry Adoption:** [Which industries use it most]
• **Trend Analysis:** [Growing, stable, declining]

### **Alternatives Comparison**
• **Competitor 1:** [How it compares to similar formats]
• **Competitor 2:** [Advantages and disadvantages]
• **Market Leader:** [Most popular alternative]

---

## 🎯 **KEY RECOMMENDATIONS**
• [Most important recommendation 1]
• [Most important recommendation 2]
• [Most important recommendation 3]
• [Most important recommendation 4]
• [Most important recommendation 5]

## 💡 **COMPLETE FILE TYPE ASSESSMENT**
[Comprehensive analysis of what this file type is, its strengths and weaknesses, how to work with it effectively, potential challenges, best practices for handling it, and strategic recommendations for different use cases and scenarios]

**CRITICAL SUCCESS CRITERIA:**
✅ Provide COMPLETE compatibility information for all platforms
✅ List ALL software options (free, paid, online) with details
✅ Include ALL conversion possibilities with quality assessments
✅ Address ALL security and privacy considerations
✅ Structure with perfect formatting using bullet points and tables
✅ Give comprehensive practical guidance for all scenarios
✅ Provide strategic insights and industry context

**REMEMBER:** This must be a complete, authoritative guide for working with this file type, perfectly structured with comprehensive information for all possible use cases and scenarios.
`;

    const result = await this.model.generateContent([prompt]);
    const response = await result.response;
    return response.text();
  }

  // Helper methods
  private extractDocumentType(analysis: string): string {
    const typeMatch = analysis.match(/\*\*Type:\*\*\s*([^\n]+)/);
    return typeMatch ? typeMatch[1].trim() : 'Unknown';
  }

  private extractKeyFindings(analysis: string): string[] {
    const findings: string[] = [];
    const lines = analysis.split('\n');
    
    let inKeySection = false;
    for (const line of lines) {
      if (line.includes('Key Information') || line.includes('Key Recommendations') || line.includes('Important')) {
        inKeySection = true;
        continue;
      }
      
      if (inKeySection && line.startsWith('• ')) {
        findings.push(line.substring(2).trim());
      } else if (inKeySection && line.startsWith('#')) {
        break;
      }
    }
    
    return findings.slice(0, 5);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private isTextFile(file: File): boolean {
    const textTypes = [
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/csv',
      'application/json', 'application/xml', 'text/xml', 'text/markdown'
    ];
    
    const textExtensions = [
      '.txt', '.md', '.html', '.htm', '.css', '.js', '.json', '.xml', '.csv',
      '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.swift'
    ];
    
    return textTypes.includes(file.type.toLowerCase()) || 
           textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot) : 'No extension';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isConfigured(): boolean {
    return this.isInitialized;
  }
}