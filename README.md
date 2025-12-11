SickNote ReadMe Instructions

1. Open both the frontend and backend folders separately in VSCode/terminal.  
2. Open backend folder in terminal.  
3. Create virtual environment (for macOS/Linux may differ for windows) and install requirments:  
   python3 -m venv .venv  
   source .venv/bin/activate // (you have to reactivate it each time you reopen backend most likely)  
   pip install -r requirments.txt  
4. Now run tests and view the coverage by running this in backend, you can also view the coverage report in the pdf in gradescope:  
   pytest --cov=app --cov-report=term-missing  


Now before you run the test you have an option for the email functionality. If you want to have a real email sent out, the way the system works you need to have environment variables for the SMTP. This is only necessary to test the funtionality of the emails being sent, if you skip this you can still use the app and the system will print in terminal what the email would look like if SMTP was enabled. In a production version this would have a SickNote email address that it sends from. If you want to test the full SMTP functionality just fill out these environment variables with an email and app password and then paste them into the backend terminal (make sure the venv is active):  
export SMTP_HOST=smtp.gmail.com  
export SMTP_PORT=465  
export SMTP_USER= // email address  
export SMTP_PASS= // App password, not your regular account password (https://support.google.com/accounts/answer/185833?hl=en)  
export SMTP_FROM= // email address  
export USE_SMTP=true  

If you want to go back to the mock emails make sure to put this in terminal:  
export USE_SMTP=false  

Continued:  

5. Open the backend terminal and run:  
   uvicorn app.main:app --reload --port 8000  
6. Open the fronend terminal and run:  
   npm install    
   npm run dev  
7. Click on the link that shows up in the frontend terminal or type http://localhost:5173/ in your browser
8. Click on the sign up button.
9. Enter a name, email address and password.
10. Select Student as the account type.
11. You can now access all the functionality for student.
12. Press the log out button and repeat the sign up process but select professor for the account type to get access to the professor page.
13. You can switch between the student and professor accounts to test the app.

Possible Login Issue:  
This is should never happen on this version, but just in case, if your login stop working run the reset_users_demo.py file. Only do this if there is an issue with log in.    

Functionality:  
Students can log illnesses, view all their logged illnesses, add friends (emails) and send notifications to them, adjust privacy settings to allow sharing with professors or students or both, add new classes with the class code that is created by the professor, and leave classes.  

Professors can access the "Class Summary" page where they can view the overall health of the classses, and the health status of students who have joined their classes. They can switch between classes using the dropdown menu in the top right of the class summary page. They also have access to the "Add a New Class" page which allows them to create new classes which involves choosing a title and class code for the class. The class code is used to allow student users to join the class, so they just need to enter that class code to join in the student "Class" tab which has the option to join a class.  
