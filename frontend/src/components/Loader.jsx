   import { useEffect, useState } from "react";

   function Loader() {
     const [slow, setSlow] = useState(false);

     useEffect(() => {
       const t = setTimeout(() => setSlow(true), 4000);
       return () => clearTimeout(t);
     }, []);

     return (
       <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-100">
         <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
         <p className="text-gray-700">Loading...</p>
         {slow && (
           <p className="max-w-sm text-center text-sm text-gray-500">
             Server start ho raha hai (free hosting). Pehli baar 1 minute tak lag sakta hai, thoda ruko.
           </p>
         )}
       </div>
     );
   }

   export default Loader;