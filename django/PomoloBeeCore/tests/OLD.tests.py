 # Global test script

import unittest

# Discover and run all test cases
if __name__ == "__main__":
    unittest.defaultTestLoader.discover(start_dir=".", pattern="test_*.py")
