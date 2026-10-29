from voto_a_voto import csvio


def test_rows_are_written_utf8_with_lf_and_quoted_only_when_needed():
    content = csvio.write_rows(["a", "b"], [["Maceió", 'diz "oi"'], ["x,y", "linha\nnova"]])

    assert content == 'a,b\nMaceió,"diz ""oi"""\n"x,y","linha\nnova"\n'.encode("utf-8")
    assert b"\r" not in content


def test_rows_read_back_as_written_including_embedded_newlines():
    rows = [["Maceió", 'diz "oi"'], ["x,y", "linha\nnova"]]

    read = csvio.read_rows(csvio.write_rows(["a", "b"], rows))

    assert read == [{"a": "Maceió", "b": 'diz "oi"'}, {"a": "x,y", "b": "linha\nnova"}]
