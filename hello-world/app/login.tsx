

export default function Login() {
  return (
    <div className="flex flex-col justify-center items-center h-screen background-login bg-no-repeat bg-center bg-contain">
      <div className="mb-0 input_position_username">
          {/* <label htmlFor="user_name" className="block mb-2 text-sm font-medium text-gray-900">Username</label> */}
          <input type="text" id="username" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-800 focus:border-green-800 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="username"/>
      </div>
      <div className="mb-17 input_position_password">
          {/* <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">Password</label> */}
          <input type="password" id="password" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-green-800 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-green-800 dark:focus:border-green-800" placeholder="•••••••••" required />   
      </div>
      <div>
          <button className="mt-8 px-6 py-3 button-position opacity-75 bg-green-900 text-white text-2xl font-normal rounded-lg transform transition-all hover:scale-110">
            LOG IN
          </button>
      </div>
    </div>


  );
}
  
