import { Link } from "@tanstack/react-router";


const Header = () => {
  return (
    <h1 className="text-center text-xl mb-5" >
      <Link to="/">
        PasteBin
      </Link>
    </h1>
  )
}
export default Header;