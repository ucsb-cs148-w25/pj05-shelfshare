# AI CODING 
List the AI tool you utilized, the outcomes you produced, and, importantly, reflections on: 
* how useful this tool was / potentially could be for your coding effort going forward
* what steps you needed to (or couldn’t) take to ensure that the AI output was correct, understandable, and fair use


## Bella
* AI tool used: DeepSeek
* Outcomes: worked on prototypes for adding animations to the For You page when hovering over a book. I asked for a page turning animation and went back and forth with DeepSeek for a while, but I do not really like the animations it made for page turning and don't think they look anything like page turning. But I liked the outcome prototype for exploding the book you are hovering on in the row. I included not hovering and hovering screenshots to get the idea. 
  
<img width="1080" alt="Screenshot 2025-02-11 at 5 39 04 PM" src="https://github.com/user-attachments/assets/7294e5c2-7f2d-4259-b664-bcb1e5492b83" />
  
<img width="1033" alt="Screenshot 2025-02-11 at 5 39 11 PM" src="https://github.com/user-attachments/assets/e2c98779-466c-47ca-b1b0-6d36ab883f7f" />

#### Reflection: 
* Deepseek was very helpful for starting the code and making adjustments when you give it feedback. It was able to make many edits and work with me. It could be useful for our coding effort going forward to give it basic UI implementation as it seems to get that correct the most. Sometimes though, after asking a few questions it stops answering your question and tells you to ask again later. I think it is pretty useful to experiment with different UI features and animations. 
* I needed to look over the code I was given and look for anything that seemed out of place. Also I had to heavily test the code locally and ensure there were no edge cases the AI waas not covering. I was able to simply promt the AI to give understandable explanation of the output. To ensure it is fair use, I ensure the output is not far off from the code I give the AI to prevent any complete copying. 

## Niyati
* AI tool used: ChatGPT
* Outcomes: worked on the frotend portion of the timeline page. I gave chatgpt the figma that we created and asked it to create a page like the figma. It created something similar to the page but not exactly the same as the Figma.

![image](https://github.com/user-attachments/assets/3158c8e6-2ba9-4ff6-a386-3c7493b558c6)

#### Reflection:
* ChatGPT was somewhat helpful. Although it took a lot of refining to get the page to look like the Figma page. It got the colors incorrect the first time and the UI didn't look great. It got the functionality of the page correctly but in terms of UI I thought it could have done better. I had to ask ChatGPT multiple times to fix the UI and where I wanted specific boxes. At the end, the page did not exactly the same as the figma but it looked similar enough.

## Hannah
* AI tool used: Claude
* Outcomes: I used Claude to help implement a dynamic bookshelf feature for our reading tracking application. The feature allows users to organize their books into different shelves (Currently Reading, Want to Read, and Finished Reading) and mark books as favorites. Claude helped me set up Firebase integration for storing the data and guided me through fixing various TypeScript errors. The end result is a working shelf system where users can easily categorize their books and see them displayed in an organized way, with real time updates when books are added or moved between shelves.

<img width="1217" alt="Screenshot 2025-02-13 at 1 03 31 PM" src="https://github.com/user-attachments/assets/3781c374-f7c9-43de-885d-85233b7cd3fb" />
<img width="1216" alt="Screenshot 2025-02-13 at 1 03 55 PM" src="https://github.com/user-attachments/assets/9e701a0e-a99b-4770-a074-8f640dedbde5" />

#### Reflection:
Working with Claude on this feature was both helpful and educational. While the AI was great at suggesting solutions and fixing TypeScript errors, I learned it's important to be specific with questions and break down problems into smaller parts. Sometimes we had to go through multiple iterations to get the types right, especially with Firebase integration. The most valuable aspect was how Claude explained each solution, helping me understand not just what to do but why certain approaches were better than others. This experience showed me that AI can be a powerful tool for development, but it works best when used as a guide rather than just a solution provider.

## Towela
* AI tool used: Gemini
* Outcomes: I used Gemini to write styling code for the front end of the Friend's page so that I could test the backend. I prompted the model to specifically use Tailwind CSS. The first iteration was not close to what I asked of the model. I had to adjust my prompt in order to get a better result. After the third time, the UI looked more like I expected.

![image](https://github.com/user-attachments/assets/b950aeb8-4450-4547-8a3e-963fc6a3cb43)

Reflection: While Gemini is good at summarising and explaining code, it struggles to comprehend bigger tasks. It fixed an issue but then created an issue on another line. In the end, I got the UI that I wanted and it worked as it should. If I had asked it for smaller components at a time, I think it would have performed better.

## Charlene
* AI tool used: ChatGPT
* Outcomes: I used ChatGPT to help create a dropdown bar that would open and close upon clicking and be styled the same as the rest of the navigation. I prompted to specifically create a drop down and then use CSS to create styling that matched existing custom colors. This worked out well, but I needed to make sure to read through the explanations so that I understood how it would all come together.  
![image](https://github.com/user-attachments/assets/8af597c7-c80f-4c8f-a77b-8c5ef4c66ef2)

#### Reflection: 
Overall ChatGPT proved to be fairly helpful. I think that this was in part due to the description I gave in the prompt being fairly specific in order to get clean understandable results. I think that it also helped that I identified what code I had already and wanted only a certain portion to be updated. This allowed for consistency. Additionally, the explanations were clear and I felt confident that I knew what the lines meant by the time I was testing the code. In the end, this was a learning experience and I am happy it all went so smoothly. 

## Srin
* AI tool used: ChatGPT
* Outcomes: I used ChatGPT to assist me in writing a testing script for the unit testing requirement for this weeks lab. I prompted the tool to create a script to test a button push on my navigation bar by including how to find the button, the name of the specific component, and the expected outcome of the button push, which was to redirect the user to home. The first response did not show me the reponse I was looking for, so I had to adjust it to be specific that the libraries I wanted to use were Jest and the React Testing Library

#### Reflection:
I think ChatGPT is a very useful tool when it comes to writing test scripts. It saves the programmer a lot of time and sometimes includes tests for aspects that humans can forget to consider. I think it is not 100% accurate though, so its more useful to use as a starting point and then tweak it while going forward. It also was clear in explaining each chunk of code so I was able to understand what each portion was doing, which also helped me when a certain part wouldn't work as expected. Overall, it was a helpful tool but I also think it is important to be specific in prompting and also knowledgable about the overall idea of what you are doing, so it is easier to debug.

## Sungchae 
* AI tool used: ChatGPT
* Outcomes: I used ChatGPT to generate the firebase rules that give access to the users to save their profile information in their database. I prompted to specifically give access to the authenthicated users who used google oath to sign into the webpage. In the first time, it did not produced the expected result. Instead, it gave me a code for .json file which is completely different from what I was expecting. Then, after reprompting the question with the detail of the firebase perspective, it correctly generate the code that I needed.

<img width="1243" alt="Screenshot 2025-02-14 at 5 08 27 PM" src="https://github.com/user-attachments/assets/03467ca9-cc59-4b3e-98d3-7098e0cebbae" />

#### Reflection:
In summary, ChatGPT increased efficiency by providing the desired result in the end with a reasonable amount of time. It definitely reduced the necessary reading and searching time required for finding information about the firebase online. I do not think that AI is a tool that produces the correct output in the first setting but rather a vehicle that helps users to climb up step by step heading towards their desired results. It is an interactive process where users provide the responsive context and additional detail to AI in each step. After getting the potential end result, I tested the rule by checking the communication between my local host and firebase using firebase API. I think it is necessary to verify the results that AI produced in the end.  


