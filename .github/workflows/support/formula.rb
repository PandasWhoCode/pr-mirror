class PrMirror < Formula
  desc "A CLI Tool to mirror an existing pull request from a public GitHub repository"
  homepage "https://github.com/PandasWhoCode/pr-mirror"
  url "SUB_URL"
  sha256 "SUB_SHA256"
  license "Apache-2.0"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
     assert_match "prmirror", shell_output("#{bin}/prmirror --help 2>&1", 0)
  end
end
