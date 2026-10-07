const surveyFutureData = {
  title: "Futures Survey",
  logo: "/Relish_Logo_Master_01.png",
  showNavigationButtons: true,
  navigationButtonsLocation: "topBottom",
  pages: [
    {
      name: "study_info",
      elements: [
        {
          type: "html",
          name: "intro_text",
          html: `
            <p>Welcome! We are inviting you to complete a survey to help us understand your general outlook on the future.</p>
            <p>This is a brief survey to understand your attitudes toward the future—your outlook and how relevant you find different factors are in impacting the future. It’s not about accurately predicting, or striving to be right or wrong. Instead, we want to hear how you speculate about the future according to your experiences, beliefs, and expectations.</p>
            <p>This survey is part of the European project RELISH – Reframing European gastronomy Legacy through Innovation, Sustainability and Heritage (reference 101177427), funded by the Horizon Europe program (HORIZON-CL2-2024-HERITAGE-01).</p>
            <p>This survey is anonymous. We do not collect names or personal identifiers, and your responses will never be linked to your identity. Data will be securely stored and used exclusively for educational, research, and cultural purposes within the RELISH project. The insights gathered may inform academic publications, workshops, exhibitions, or creative formats—always in a way that respects and protects your anonymity.</p>
            <p>Clicking COMPLETE means you have consented to share your responses with us to use them in the way we’ve explained in the survey description (see “Show Information” below).</p>
            <p>If you have any questions, please contact the RELISH team through the project website (<a href="https://relisheu.org" target="_blank">relisheu.org</a>).</p>
          `
        },
        {
            type: "boolean",
            name: "show_more_info",
            title: "Click here for more information before filling out the questionnaire.",
            labelTrue: "Show information",
          labelFalse: "Hide information",
            defaultValue: false
            },
            {
            type: "html",
            name: "risks_benefits_institutional_contact",
            visibleIf: "{show_more_info} = true",
            html: `
            <h6>Thank you for your interest in taking this survey!</h6>
            <p>We are RELISH, a group of researchers working on a project about how food recipes and practices adapt to changing people and environments in Europe, today and in the future. RELISH is a project funded by Horizon Europe, a form of European funding that is awarded to groups of researchers from different universities, research centres and community organisations across Europe on a topic that can benefit or improve society.  
            <h6>What is this survey about? </h6>
            <p>We created these questions to understand how your thoughts and everyday cooking or eating activities relate to the way that you live and connect with others through food.  </p>
            <p>By answering these questions, you will help us gain important insights about you and others’ connections or interests in foods that might have national, regional, or personal significance. We’re particularly interested to know if where you grew up, moved to, or who you eat with impacts these connections or interests, and how you see connections to food in your future life in a changing world.  </p>
            <h6>What kinds of questions am I responding to? </h6>
            <p>We’re asking questions in the form of multiple-choice, short and long-written responses. We’re not going to ask you anything stressful or negative. It might be boring, but we hope that you’ll have fun taking the survey! </p>
            <h6>How long is this going to take? </h6>
            <p>We think the Food & Culture Questionnaire will take about 15 min, and the Futures and Visions survey about 20 min. Ideally, we would like respondents to take both parts, but you do not have to complete and submit them at the same time.  </p>
            <h6>What are my options when taking this survey? </h6>
            <p>It’s totally up to you whether you want to complete the survey. We won’t be collecting your name or contact info, or any specific information that could identify you. You should never expect any negative pushback from anyone on our team if you choose not to take any of the surveys.   </p>
            <p>If you do want to connect with us further after taking the survey, we have some options for you: </p>
            <p>You can send us your email after submitting one or more of the survey parts to keep in touch with RELISH and participate in other activities we’re up to. We’ll make sure your contact info isn’t shared with anyone except for the RELISH team, and your email won’t be linked to your survey responses.  </p>
            <p>If you’re interested in taking future surveys with us, feel free to bookmark this web application. The app will have up to date information about new surveys available for you to take. We’ll also use it to update you about how your responses were used in our project! </p>
            <h6>Who has access to my responses? </h6>
            <p>We store your responses in a secure database to stop anyone from accessing or copying this data. Your individual responses will be anonymous and will only be seen by RELISH researchers.  </p>
            <p>We will never collect any information except for the responses you provide, and your email if you choose to provide this. Our team developed this web app, so no third-party can spy on how, when, and where you use this either! </p>
            <h6>What if I change my mind? </h6>
            <p>Right before you finish and submit a survey part, you’ll get a brief message about how clicking “Complete” means you’ve consented to send your responses to us to use them in the way we’ve explained.   </p>
            <p>If at any time before clicking “Complete” you decide you don’t want to provide your responses, simply exit the survey! Nothing will be saved. If you change your mind later, you’ll have to restart the survey from scratch.  </p>
            <h6>What if I want to learn more, or reach out to someone about RELISH? </h6>
            <p>In the survey interface, you can access links to learn more about RELISH, some technical information and links about research ethics, and the contact info for the team who is running this survey.  </p>
            <p>You don’t have to take a survey to access any of these resources or get in contact with us—we’re always happy to connect and chat about food and recipes! </p>
            <h6>What happens after the survey? </h6>
            <p>Your data is going to be used by our team to do a few different things: after we collect responses, we’ll create visuals and preliminary analysis. You’ll be able to see these on the RELISH digital platform at a later date.  </p>
            <p>Your responses may inform academic publications, workshops, exhibitions, or creative formats—always in a way that respects and protects your anonymity. We’re happy to provide a copy of any of these outputs to you, and we’ll upload them to the RELISH digital platform for you to download or view as soon as they’re available. </p>
            <p>If you want, you can participate in other future surveys or opportunities to submit your experiences and food narratives to our team.  </p>
            <h6>Ready to start? </h6>
            <p>Find a comfy spot and grab a beverage, then click “[Next]” to begin! </p>
            <h6>Institutional Agreements and Funding</h6>
            <p>RELISH and its data gathering activities are funded by Horizon Europe (HE), under the call: <strong>HORIZON-CL2-2024-Heritage-01</strong>. Project information can be found on HE’s Cordis database through the following link:
            <a href="https://cordis.europa.eu/project/id/101177427" target="_blank">https://cordis.europa.eu/project/id/101177427</a>
            or Project №101177427</p>
            <p>As an HE-funded project, RELISH conforms to <a href="https://ec.europa.eu/info/funding-tenders/opportunities/docs/2021-2027/horizon/guidance/european-code-of-conduct-for-research-integrity_horizon_en.pdf" target="_blank"> "The European Code of Conduct for Research Integrity”</a> (European Commission, Revised Edition 2023), developed by the European Federation of Academies of Sciences and Humanities (ALLEA). The Code of Conduct outlines the principles, good research practices, and conditions of violating research integrity for all participating projects.</p>
            <p>The RELISH project is coordinated by <strong>Durham University (UK)</strong>.</p>

            <p><strong>The participating institutions are:</strong></p>
            <ul>
              <li>Fundació Alícia (Spain)</li>
              <li>University of Milan / Universitá degli Studi di Milano (Italy)</li>
              <li>University of Gastronomic Sciences / Universitá degli Studi di Scienze Gastronomiche (Italy)</li>
              <li>City, University of London (UK)</li>
              <li>University of Alicante / Universidad de Alicante (Spain)</li>
              <li>Research Centre of Institut LYFE / Centre de Recherche de l’Institut LYFE (France)</li>
              <li>Roskilde University / Roskilde Universitet (Denmark)</li>
              <li>University College Cork (Ireland)</li>
              <li>Atlantic Technological University, Galway (Ireland)</li>
              <li>Barcelona Supercomputing Center / Centro Nacional de Supercomputación (Spain)</li>
              <li>Instituto Superior Técnico at the University of Lisbon / Universidade de Lisboa (Portugal)</li>
              <li>University of Toronto, Scarborough (Canada)</li>
            </ul>

            <h6>Contact</h6>
            <p>Survey inquiries can be sent to the RELISH team through the project website (<a href="https://relisheu.org" target="_blank">relisheu.org</a>).</p>
            <p><strong>The following sources can also be consulted:</strong></p>
            <ul>
              <li>RELISH Cordis page: <a href="https://cordis.europa.eu/project/id/101177427" target="_blank">https://cordis.europa.eu/project/id/101177427</a> <p>or Project №101177427</p></li>
              <li>RELISH website: <a href="https://relisheu.org" target="_blank">relisheu.org</a></li>
            </ul>
          `
        }
      ]
    },
    {
      name: "participant_info",
      title: "Participant Information",
      elements: [
        {
        type: "text",
        name: "email",
        title: "Email Address",
        description: `Response not required
Only in case you want to get feedback about our results, receive news about the project and/or become part of our community`,
        isRequired: false,
        inputType: "email"
      },
      {
        type: "text",
        name: "birth_year",
        title: "Year of Birth",
        isRequired: true,
        inputType: "number",
        min: 1900,
        max: new Date().getFullYear(),
        validators: [
          {
            type: "numeric",
            minValue: 1900,
            maxValue: new Date().getFullYear(),
            text: "Please enter a valid year of birth using digits only (e.g. 1988)."
          }
        ]
        },
        {
          type: "radiogroup",
          name: "gender",
          title: "Gender",
          isRequired: true,
          choices: [
            "Female",
            "Male",
            "Non-binary / Third gender",
            "Prefer not to say"
          ],
          hasOther: true
        },
        { type: "text", name: "nationality", title: "Nationality", isRequired: true },
        {
          type: "dropdown",
          name: "residence_country",
          title: "Country of Residence",
          isRequired: true,
          choicesByUrl: {
            url: "/countries.json",
            valueName: "name.common"
          }
        },
        {
          type: "text",
          name: "institution",
          isRequired: true,
          title:
            "Institution (or if currently in an exchange program, home institution)"
        },
        {
          type: "radiogroup",
          name: "program",
          title: "Current Program",
          isRequired: true,
          choices: ["Bachelor's degree", "Master's degree", "Doctoral degree"]
        },
        {
          type: "radiogroup",
          name: "field_of_study",
          title: "Main Field of Study",
          hasOther: true,
          isRequired: true,
          choices: [
            "Education",
            "Arts and Humanities (e.g. History, Languages, Philosophy, Fine Arts)",
            "Social Sciences, Journalism, and Information",
            "Business, Administration, and Law",
            "Natural Sciences, Mathematics, and Statistics",
            "Information and Communication Technologies (ICTs)",
            "Engineering, Manufacturing, and Construction",
            "Agriculture, Forestry, Fisheries, and Veterinary",
            "Health and Welfare (e.g. Medicine, Nursing, Social Work)",
            "Services (e.g. Tourism, Hospitality, Sports, Personal Services)"
          ]
        }
      ]
    },
    {
      name: "future_outlook",
      title: "Future Outlook Questions",
      elements: [
        {
          type: "rating",
          name: "future_world",
          title: "1. How do you feel about the future of The World?",
          isRequired: true,
          minRateDescription: "Very pessimistic",
          maxRateDescription: "Very optimistic",
          rateMin: 1,
          rateMax: 4
        },
        {
          type: "rating",
          name: "future_europe",
          title: "2. How do you feel about the future of Europe?",
          isRequired: true,
          minRateDescription: "Very pessimistic",
          maxRateDescription: "Very optimistic",
          rateMin: 1,
          rateMax: 4
        },
        {
          type: "rating",
          name: "future_country",
          title: "3. How do you see the future of Your Country of Origin?",
          isRequired: true,
          minRateDescription: "Very pessimistic",
          maxRateDescription: "Very optimistic",
          rateMin: 1,
          rateMax: 4
        },
        {
          type: "rating",
          name: "future_personal",
          title: "4. How do you feel about Your Own Personal Future?",
          isRequired: true,
          minRateDescription: "Very pessimistic",
          maxRateDescription: "Very optimistic",
          rateMin: 1,
          rateMax: 4
        }
      ]
    },
    {
      name: "relevance_factors",
      title: "Relevance of Factors in Defining the Future",
      elements: [
        {
          //description in html
          type: "html",
          name: "relevance_instructions",
          html: `
            <p>Instructions: Rate how relevant each factor will be in defining the future.</p>
          `
        },
        {
          type: "rating",
          name: "economy",
          title: "5. Economy",
          isRequired: true,
          description:
            "This factor includes production, distribution, and consumption of goods and services within a society. Economy encompasses various aspects, such as trade, industry, and the financial sector, as well as indicators like GDP, unemployment rates, and inflation.",
          rateMin: 1,
          rateMax: 6,
          minRateDescription: "Entirely Irrelevant",
          maxRateDescription: "Extremely Relevant"
        },
        {
          type: "rating",
          name: "politics",
          title: "6. Politics",
          isRequired: true,
          description:
            "This factor refers to the governance of a society and its organizational structures. It includes institutions like governments, political parties, and other entities that make, interpret, and enforce laws and policies. Politics encompasses power dynamics, decision-making processes, and how resources and rights are allocated.",
          rateMin: 1,
          rateMax: 6,
          minRateDescription: "Entirely Irrelevant",
          maxRateDescription: "Extremely Relevant"
        },
        {
          type: "rating",
          name: "culture",
          title: "7. Culture",
          isRequired: true,
          description:
            "This factor refers to shared beliefs, values, customs, behaviours, and artifacts that members of a society use to understand their world and one another. Culture is transmitted from generation to generation. Aspects like religion, art, language, ritual, and social norms are part of culture.",
          rateMin: 1,
          rateMax: 6,
          minRateDescription: "Entirely Irrelevant",
          maxRateDescription: "Extremely Relevant"
        },
        {
          type: "rating",
          name: "security",
          title: "8. Security",
          isRequired: true,
          description:
            "This factor relates to the safety and wellbeing of a society’s members. Internally, security includes how a society manages crime, law enforcement, and civil order. Externally, security pertains to defense, foreign relations, and protections from external threat.",
          rateMin: 1,
          rateMax: 6,
          minRateDescription: "Entirely Irrelevant",
          maxRateDescription: "Extremely Relevant"
        },
        {
          type: "rating",
          name: "ecosystem",
          title: "9. Ecosystem",
          isRequired: true,
          description:
            "This factor encompasses biological environments and the web of relationships between living organisms and their physical surroundings. It includes how social systems impact to an ecosystem through human activities, and how environments in turn impact human societies. For example, these could include issues of pollution, conservation, biodiversity, and others.",
          rateMin: 1,
          rateMax: 6,
          minRateDescription: "Entirely Irrelevant",
          maxRateDescription: "Extremely Relevant"
        },
        {
          type: "rating",
          name: "technology",
          title: "10. Technology",
          isRequired: true,
          description:
            "This factor refers to how people apply scientific knowledge for practical purposes. Technology encompasses tools, machines, techniques, and methods to solve problems. It also relates to how technologies can impact and be impacted by other social factors.",
          rateMin: 1,
          rateMax: 6,
          minRateDescription: "Entirely Irrelevant",
          maxRateDescription: "Extremely Relevant"
        }
      ]
    }
  ]
};

export default surveyFutureData;