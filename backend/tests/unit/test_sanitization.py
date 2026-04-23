"""Tests for input sanitization module."""

import pytest
from backend.core.sanitization import (
    MEAL_SANITIZE_FIELDS,
    USER_SANITIZE_FIELDS,
    sanitize_dict,
    sanitize_html_content,
    sanitize_string,
)


class TestSanitizeString:
    """Tests for sanitize_string function."""

    def test_sanitize_none(self):
        """Test that None returns None."""
        assert sanitize_string(None) is None

    def test_sanitize_empty_string(self):
        """Test empty string sanitization."""
        assert sanitize_string("") == ""
        assert sanitize_string("   ") == ""

    def test_sanitize_normal_string(self):
        """Test normal string passes through."""
        assert sanitize_string("Hello World") == "Hello World"
        assert sanitize_string("John Doe") == "John Doe"

    def test_sanitize_html_entities(self):
        """Test HTML special characters are escaped."""
        assert sanitize_string("<script>") == "&lt;script&gt;"
        assert sanitize_string("a < b > c") == "a &lt; b &gt; c"
        assert sanitize_string("Tom & Jerry") == "Tom &amp; Jerry"
        assert sanitize_string('"quoted"') == "&quot;quoted&quot;"
        assert sanitize_string("'single'") == "&#x27;single&#x27;"

    def test_sanitize_xss_script_tag(self):
        """Test XSS script tag is neutralized."""
        malicious = "<script>alert('XSS')</script>"
        result = sanitize_string(malicious)
        assert "<script>" not in result
        assert "alert" in result  # Content is preserved, just escaped

    def test_sanitize_javascript_protocol(self):
        """Test javascript: protocol is removed."""
        assert "javascript:" not in sanitize_string("javascript:alert(1)")
        assert "javascript:" not in sanitize_string("JAVASCRIPT:void(0)")
        assert "javascript:" not in sanitize_string("JaVaScRiPt:exploit()")

    def test_sanitize_data_protocol(self):
        """Test data: protocol is removed."""
        assert "data:" not in sanitize_string("data:text/html,<script>")
        assert "data:" not in sanitize_string("DATA:image/svg+xml,malicious")

    def test_sanitize_vbscript_protocol(self):
        """Test vbscript: protocol is removed."""
        assert "vbscript:" not in sanitize_string("vbscript:MsgBox")
        assert "vbscript:" not in sanitize_string("VBSCRIPT:exploit")

    def test_sanitize_event_handlers(self):
        """Test on* event handlers are removed."""
        assert "onclick=" not in sanitize_string("onclick=alert(1)")
        assert "onload=" not in sanitize_string("onload=malicious()")
        assert "onerror=" not in sanitize_string("onerror=hack()")
        assert "onmouseover=" not in sanitize_string("onmouseover=bad()")

    def test_sanitize_strips_whitespace(self):
        """Test leading/trailing whitespace is stripped."""
        assert sanitize_string("  hello  ") == "hello"
        assert sanitize_string("\n\ttest\n") == "test"

    def test_sanitize_non_string_input(self):
        """Test non-string input is converted to string."""
        assert sanitize_string(123) == "123"
        assert sanitize_string(45.67) == "45.67"

    def test_sanitize_unicode(self):
        """Test unicode characters are preserved."""
        assert sanitize_string("Héllo Wörld") == "Héllo Wörld"
        assert sanitize_string("日本語") == "日本語"
        assert sanitize_string("🏋️ Workout") == "🏋️ Workout"


class TestSanitizeDict:
    """Tests for sanitize_dict function."""

    def test_sanitize_specified_fields(self):
        """Test only specified fields are sanitized."""
        data = {
            "name": "<script>evil</script>",
            "count": 42,
            "description": "Safe text",
        }
        result = sanitize_dict(data, ["name"])

        assert "&lt;script&gt;" in result["name"]
        assert result["count"] == 42  # Unchanged
        assert result["description"] == "Safe text"  # Unchanged

    def test_sanitize_missing_fields(self):
        """Test missing fields are handled gracefully."""
        data = {"name": "John"}
        result = sanitize_dict(data, ["name", "nonexistent"])

        assert result["name"] == "John"
        assert "nonexistent" not in result

    def test_sanitize_non_string_fields(self):
        """Test non-string fields are not modified."""
        data = {
            "name": "Test",
            "age": 25,
            "active": True,
        }
        result = sanitize_dict(data, ["name", "age", "active"])

        assert result["name"] == "Test"
        assert result["age"] == 25  # Not modified (not a string)
        assert result["active"] is True

    def test_original_dict_unchanged(self):
        """Test original dictionary is not mutated."""
        original = {"name": "<b>Bold</b>"}
        result = sanitize_dict(original, ["name"])

        assert original["name"] == "<b>Bold</b>"  # Original unchanged
        assert "&lt;b&gt;" in result["name"]


class TestSanitizeHtmlContent:
    """Tests for sanitize_html_content function."""

    def test_removes_html_tags(self):
        """Test all HTML tags are removed."""
        assert sanitize_html_content("<b>bold</b>") == "bold"
        assert sanitize_html_content("<div class='test'>content</div>") == "content"
        assert sanitize_html_content("<a href='url'>link</a>") == "link"

    def test_removes_script_tags_and_content(self):
        """Test script tags are removed."""
        result = sanitize_html_content("<script>alert(1)</script>text")
        assert "<script>" not in result
        assert "text" in result

    def test_sanitize_none(self):
        """Test None returns None."""
        assert sanitize_html_content(None) is None

    def test_plain_text_preserved(self):
        """Test plain text is preserved."""
        assert sanitize_html_content("Hello World") == "Hello World"


class TestSanitizeFieldLists:
    """Tests for predefined field lists."""

    def test_user_sanitize_fields_defined(self):
        """Test USER_SANITIZE_FIELDS contains expected fields."""
        assert "username" in USER_SANITIZE_FIELDS
        assert "full_name" in USER_SANITIZE_FIELDS

    def test_meal_sanitize_fields_defined(self):
        """Test MEAL_SANITIZE_FIELDS contains expected fields."""
        assert "note" in MEAL_SANITIZE_FIELDS
        assert "description" in MEAL_SANITIZE_FIELDS


class TestRealWorldXSSPayloads:
    """Tests against real-world XSS payloads."""

    @pytest.mark.parametrize("payload", [
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert(1)>",
        "<body onload=alert(1)>",
        "<input onfocus=alert(1) autofocus>",
        "<marquee onstart=alert(1)>",
        "<video><source onerror=alert(1)>",
        "<audio src=x onerror=alert(1)>",
        '"><script>alert(1)</script>',
        "'-alert(1)-'",
        "<iframe src=javascript:alert(1)>",
        "<object data=javascript:alert(1)>",
        "<embed src=javascript:alert(1)>",
        "<a href=javascript:alert(1)>click</a>",
        "<form action=javascript:alert(1)><input type=submit>",
        "<isindex action=javascript:alert(1) type=submit>",
        "<input type=image src=x onerror=alert(1)>",
        "<link rel=import href=javascript:alert(1)>",
        "<base href=javascript:alert(1)//>",
    ])
    def test_xss_payloads_neutralized(self, payload):
        """Test various XSS payloads are neutralized."""
        result = sanitize_string(payload)

        # Should not contain unescaped tags
        assert "<script>" not in result
        assert "<img " not in result
        assert "<svg " not in result

        # Should not contain javascript: protocol
        assert "javascript:" not in result.lower()

        # Should not contain event handlers (already tested individually)
        # The important thing is the output is safe HTML
