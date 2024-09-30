package tree_sitter_cyclone_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_cyclone "github.com/lucid-brndmg/tree-sitter-cyclone/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_cyclone.Language())
	if language == nil {
		t.Errorf("Error loading Cyclone grammar")
	}
}
