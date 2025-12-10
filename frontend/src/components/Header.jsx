function Header() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-3">
      <img
          src="/rubricly-logo.png"
          alt="Rubricly logo"
          className="h-16 w-auto sm:h-20 md:h-24"
        />
        <h1 className="text-5xl font-bold text-orange-600">
          Rubricly
        </h1>
      </div>
      <p className="text-xl text-gray-600">
        Upload a PRB PDF to extract all scores and comments from one or many rubrics
      </p>
    </div>
  )
}

export default Header

