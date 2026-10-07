const surveyVisionsData = {
  title: "Food Visions/Images (About The Future)",
  logo: "/Relish_Logo_Master_01.png",
  showNavigationButtons: true,
  navigationButtonsLocation: "topBottom",
  pages: [
    {
      name: "about_project",
      elements: [
          {
            type: "html",
            name: "intro_text",
            html: `
            <p>Welcome! We are inviting you to complete a written response about the future. Your response will help us understand how your attitudes about the future relate to food.</p>
            <p>For this survey, we ask for a short, written response (3000 characters maximum) on how you imagine how you would cook and eat in a day in the life in 2050. It’s not about accurately predicting, or striving to be right or wrong. Instead, we want to hear how you speculate about the future according to your experiences, beliefs, and expectations.</p>
            <p>This survey is part of the European project RELISH – Reframing European gastronomy Legacy through Innovation, Sustainability and Heritage (reference 101177427), funded by the Horizon Europe program (HORIZON-CL2-2024-HERITAGE-01).</p>
            <p>Your written response is anonymous. We do not collect names or personal identifiers, and your response will never be linked to your identity. Data will be securely stored and used exclusively for educational, research, and cultural purposes within the RELISH project. The insights gathered may inform academic publications, workshops, exhibitions, or creative formats—always in a way that respects and protects your anonymity.</p>
            <p>Clicking COMPLETE means you have consented to share your responses with us to use them in the way we’ve explained in the survey description (see “Show Information” below).</p>
            <p>If you have any questions, please contact the RELISH team through the project website (<a href="https://relisheu.org" target="_blank">relisheu.org</a>).</p>
          `,
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
        }]
    },
    {
      name: "participant_info",
      title: "PARTICIPANT INFORMATION",
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
          title: "What program are you enrolled now?",
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
        }]},
        {
          name: "study_info",
          elements: [
            {
          type: "html",
          name: "intro_text",
          html: `
            <h4>It’s 2050—How do you feed yourself?</h4>
            <p>In a short, written response (<strong>maximum 3,000 characters</strong>), imagine you are living in 2050. Think about how the world and your life will be. Relay these thoughts in a free essay, short story, or diary entry about “a day in the life in 2050,” focussing on how you would hypothetically cook or eat.</p>
            <p>You can use any or all of the following questions about food to help you write your “day in the life in 2050” response:</p>
            <ul>
            <li>Do you cook? </li>
            <li>How do you cook?  </li>
            <li>What do you eat? </li>
            <li>When do you eat?</li>
            <li>Where do you eat?</li>
            <li>With whom do you eat?</li>
            </ul>
            <p>Please write the story in <strong>present tense</strong>—as if you are there and then in 2050.</p>
            `
            },
            {
              type: "boolean",
              name: "show_example",
              title: "Would you like to see an example before answering?",
              labelTrue: "Yes",
              labelFalse: "No",
              defaultValue: false
            },
            {
          type: "html",
          name: "example_text",
          visibleIf: "{show_example} = true",
          html: `
            <h4>Example (just to inspire you):</h4>
            <p>It's July, 4th 2050, 8am. Today is my 45th birthday and I'm going to prepare a dinner for tonight. It's been a long time without cooking.. 20 years or more: I guess the last time I cooked by myself was during my university years when I shared an apartment with colleagues. I remember we used to cook simple and cheap things most of times, when not ordering something to Uber Eats (before the government banning sharing economy in 2030). So, it has bee a long while. But last weekend I found an old recipes book, handwritten by my grandma, at my mum's home. Many of the ingredients are currently not available or convenient, either because they have disappeared as species (like salmon, due to the sea temperature increasing), banned by authorities (pig, chicken), are unavailable (the commercial war with China broke supply chains), too expensive (like fresh fruits) or just fake products (raw cow is just an edible printed synthetic polymer, protein-fueled, that looks like meat but it´s not). Anyway... I'll try to adapt my grandma's 1990s traditional recipe to our reality today and the existing ingredients. Well be 7 since I expect having 6 guests: my neighbor and his two wives, my ex (which I found in a dating app) and her human-looking robot (call it replicant), and my sister who is living in a Mars colony so she will be present in a hologram format. So, actually, and since the robot and the hologram doesn't eat physically, I have to prepare real meals only for 4; and buying a protocol fake menu for the robot and the digital simulation for the hologram... because an event like this is (still, like it used to be in our mediterranean culture) not about "eating" in itself but about sharing an experience instead. Etcétera, etcétera...
            `
        },
        {
          type: "comment",
          name: "day_in_life_2050",
          title: "A Day in the Life in 2050",
          isRequired: true,
          maxLength: 3000,
          rows: 8
        }
      ]}]
    };

export default surveyVisionsData;