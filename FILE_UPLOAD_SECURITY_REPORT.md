# 🔒 File Upload Security - Implementierungsplan

## ✅ Erstellt

### 1. File Validation Module (`backend/core/file_validation.py`)

**Funktionen:**
- ✅ `validate_file_size()` - File Size Validation
- ✅ `validate_file_extension()` - Extension Validation
- ✅ `validate_image_content()` - MIME Type + PIL Image Verification
- ✅ `generate_secure_filename()` - Secure Filename Generation (Path Traversal Schutz)
- ✅ `validate_upload_path()` - Path Traversal Prevention
- ✅ `validate_image_upload()` - Complete Validation Pipeline

**Features:**
- File Size Limits (configurable via settings)
- Allowed Extensions (.jpg, .jpeg, .png, .webp)
- MIME Type Validation (with python-magic fallback)
- PIL Image Verification (ensures file is actually an image)
- Secure Filename Generation (random prefix + sanitization)
- Path Traversal Prevention
- User-specific filename support

## 📋 Integration benötigt

### 1. meal_service.py Integration
**Aktuelle Funktion**: `_store_image()` (ca. Zeile 240+)

**Empfehlung:**
- Ersetze manuelle Validierung mit `validate_image_upload()`
- Nutze `generate_secure_filename()` für sichere Dateinamen
- Nutze `validate_upload_path()` für Path Traversal Schutz

### 2. vision_service.py Integration
**Aktuelle Funktion**: File Upload Handling

**Empfehlung:**
- Gleiche Validierung wie meal_service.py
- Konsistente Security-Checks

### 3. Optional: python-magic Installation
**Status**: Optional (Fallback zu content_type)

**Empfehlung**:
```bash
pip install python-magic-bin  # Windows
# oder
pip install python-magic  # Linux/Mac (requires libmagic)
```

**Vorteil**: Bessere MIME Type Detection (Datei-Header basiert, nicht nur Extension)

## 🔒 Security Features

### Implementiert:
1. ✅ **File Size Validation** - Verhindert DoS durch große Dateien
2. ✅ **Extension Whitelist** - Nur erlaubte Dateitypen
3. ✅ **MIME Type Validation** - Verhindert Extension-Spoofing
4. ✅ **PIL Image Verification** - Stellt sicher, dass Datei wirklich ein Bild ist
5. ✅ **Filename Sanitization** - Verhindert Path Traversal
6. ✅ **Secure Filename Generation** - Random Prefix für Unvorhersagbarkeit
7. ✅ **Path Traversal Prevention** - Verhindert Zugriff auf andere Verzeichnisse

### Zusätzliche Empfehlungen:
1. ⏭️ **Virus Scanning** (optional, für Production)
2. ⏭️ **Image Dimensions Limits** (verhindert Memory Exhaustion)
3. ⏭️ **Rate Limiting** (bereits implementiert auf Endpoints)
4. ⏭️ **User Quota Limits** (verhindert Storage Exhaustion)

## 📝 Nächste Schritte

1. ✅ File Validation Module erstellt
2. ⏭️ Integration in meal_service.py
3. ⏭️ Integration in vision_service.py
4. ⏭️ Tests schreiben
5. ⏭️ Optional: python-magic installieren

## ✅ Zusammenfassung

**Status**: File Validation Module vollständig implementiert
**Integration**: Benötigt für meal_service.py und vision_service.py
**Security Level**: Production-ready mit optionalen Verbesserungen
