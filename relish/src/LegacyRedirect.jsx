import { Navigate, useLocation } from 'react-router-dom';

// Old address -> new one, keeping query and hash (map in legacyRoutes.json).
export default function LegacyRedirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}
