{
  description = "Python with Jypter";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }:
    let
      pkgs = nixpkgs.legacyPackages."x86_64-linux";
    in
    {
      devShells.x86_64-linux.default = pkgs.mkShell {
        packages = [
          pkgs.python3
          pkgs.python3Packages.ipykernel
          pkgs.python3Packages.tqdm
          pkgs.python3Packages.venvShellHook
          pkgs.python3Packages.ipython
          pkgs.python3Packages.beautifulsoup4
          pkgs.python3Packages.requests
          pkgs.python3Packages.seaborn
          pkgs.python3Packages.pandas
          pkgs.python3Packages.numpy
          pkgs.python3Packages.networkx
          pkgs.python3Packages.nltk
          pkgs.python3Packages.python-louvain
          pkgs.python3Packages.wordcloud
          pkgs.python3Packages.scikit-learn
        ];
		
        env.LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
          pkgs.stdenv.cc.cc.lib
          pkgs.libz
        ];
		
        venvDir = "./.venv";
		
        postVenvCreation = ''
          unset SOURCE_DATE_EPOCH
          pip install --prefix=.venv ipython ipykernel jupyter
          pip install --prefix=.venv bash_kernel
          pip install netwulf
          python -m bash_kernel.install --sys-prefix
        '';
		
        postShellHook = ''
          # allow pip to install wheels
          unset SOURCE_DATE_EPOCH
          export LD_LIBRARY_PATH=”${pkgs.stdenv.cc.cc.lib.outPath}/lib:$LD_LIBRARY_PATH”;
        '';	
      };
    };
}