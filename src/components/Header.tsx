import Link from "next/link";


const Header = () => {
  return (
    <h1 className="text-center text-xl mb-5" >
      <Link href="/">
        PasteBin
      </Link>
    </h1>
  )
}
export default Header;