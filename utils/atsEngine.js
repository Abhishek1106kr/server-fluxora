export const calculateFastATS=
(resumeText)=>{
    let score=50;//baseline Score
    const suggestions=[];

    const sections=["experience","education","skills","projects"];
    sections.forEach(section=>{
        if(new RegExp(section,"i").test(resumeText)){
            score+=5;
        }
        else{
            suggestions.push(`Missing crucial section heading:${section.toUpperCase()}`);

        }
    });

    //checking the contact channels
    if(!/@/.test(resumeText)){
        score -= 10;
        suggestions.push("Missing email address on your resume header.");
    }
    if(!/(github\.com|linkedin\.com)/i.test(resumeText)){
        score-=5;
        suggestions.push("Missing online professional link (GitHub/LinkedIn). ")
    }

    const strongVerb=["built", "developed","scaled","led","architected","optimized","implemented"];
    const verbCount=strongVerb.filter(verb=>new RegExp(`\\b${verb}`,"i").test(resumeText)).length;
    score+=(verbCount*2);
    
    if(verbCount < 2){
        suggestions.push("Use stronger action verbs to start your bullet points.");
    }
    
    //Language check
    const languageKeywords=["english","hindi","spanish","french","mandarin"];

    const lowerResume=resumeText.toLowerCase();
    languageKeywords.forEach(lang=>{
        if(lowerResume.includes(lang)){
            score+=3;
        }
    })
    //Resume Length Checking;
    const wordCount=resumeText.trim().split(/\s+/).length;
    if(wordCount<200){
        score-=(10)
        suggestions.push("Your resume is too short, try to add more details or expand on projects and achievements.")
    }
    else if(wordCount>600){
        score-=10;
        suggestions.push("Your resume is too long, try to make it more concise. aim for 500-600 words");
    }

    // Check consistency in date formats (warn if multiple formats mixed)
    const dateFormats = [
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i,
        /\b\d{2}\/\d{4}\b/,
        /\b\d{4}\s*[-–]\s*\d{4}\b/
    ];
    const matchedFormats = dateFormats.filter(fmt => fmt.test(resumeText)).length;
    if (matchedFormats > 1) {
        suggestions.push("Inconsistent date formats detected. Use one format throughout (e.g., 'Jan 2023 – Mar 2024').");
    }

    // Clamp score to 0–100
    score = Math.min(100, Math.max(0, score));

    return { score, suggestions };
}