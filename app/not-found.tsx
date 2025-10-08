// This is a core next.js file that handles 404 errors. DO NOT RENAME OR MOVE.

import Error from './components/error';

const NotFound = () => {
  return <Error h1="404" h2="Page Not Found" p="Could not find the requested resource."/>;
};
export default NotFound;