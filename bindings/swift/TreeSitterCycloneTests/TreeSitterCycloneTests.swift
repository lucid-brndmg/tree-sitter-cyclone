import XCTest
import SwiftTreeSitter
import TreeSitterCyclone

final class TreeSitterCycloneTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_cyclone())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Cyclone grammar")
    }
}
